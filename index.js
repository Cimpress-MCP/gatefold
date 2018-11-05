"use strict";

const fs = require("fs");
const cloneDeep = require("lodash.clonedeep");
const { version } = require("./package");

const dfsScrubKey = (obj, unwantedKey) => {
  Object.keys(obj).map(k => {
    if (k.startsWith(unwantedKey)) {
      delete obj[k];
      return;
    }

    if (typeof obj[k] === "object") {
      dfsScrubKey(obj[k], unwantedKey)
    }
  });
};

class Gatefold {
  constructor(swaggerPath, cloudformationPath) {
    this.swag = fs.readFileSync(swaggerPath).toString();
    this.cl = fs.readFileSync(cloudformationPath).toString();
  }

  build(scrubAws, domain, ttl, externalSwaggerTransform) {
    return this.buildCloudformationTemplate(this.buildSwagger(scrubAws, domain, ttl, externalSwaggerTransform), domain);
  }

  setSwaggerRouteResponse(swaggerObject, externalSwaggerTransform) {
    let publicSwagger = cloneDeep(swaggerObject);

    dfsScrubKey(publicSwagger, "x-amazon-apigateway");
    delete publicSwagger.paths["/{id}/proxied"];
    delete publicSwagger.paths["/not-found"];

    if (externalSwaggerTransform) {
      let transform;
      try {
        transform = require(externalSwaggerTransform);
      } catch(err) {
        throw new Error(`Could not load file ${externalSwaggerTransform}.`);
      }

      if (typeof transform !== "function") {
        throw new Error(`The file ${externalSwaggerTransform} does not export a JavaScript function.`);
      }

      publicSwagger = transform(publicSwagger);
    }

    swaggerObject.paths["/swagger"].get["x-amazon-apigateway-integration"].responses.default.responseTemplates["application/json"] = JSON.stringify(publicSwagger);
  }

  buildSwagger(scrubAws, domain, ttl, externalSwaggerTransform) {
    const replacements = {
      "GATEFOLD_DOMAIN": domain,
      "GATEFOLD_TTL": ttl,
      "GATEFOLD_VERSION": version
    };

    let substituted = this.swag;
    Object.keys(replacements).map(r => {
      substituted = substituted.replace(new RegExp(`\\$${r}`, "g"), () => replacements[r]);
    });

    let materialization;
    try {
      materialization = JSON.parse(substituted);
    } catch(err) {
      throw new Error("There were errors in the Swagger API definition after building it.");
    }

    this.setSwaggerRouteResponse(materialization, externalSwaggerTransform);

    if (scrubAws) {
      dfsScrubKey(materialization, "x-amazon-apigateway");
    }
    dfsScrubKey(materialization, "example");

    return materialization;
  }

  buildCloudformationTemplate(swagger, domain) {
    if (typeof swagger === "object") {
      swagger = JSON.stringify(swagger);
    }

    const replacements = {
      "GATEFOLD_API": swagger,
      "GATEFOLD_DOMAIN": domain
    };

    let substituted = this.cl;
    Object.keys(replacements).map(r => {
      substituted = substituted.replace(new RegExp(`\\$${r}`, "g"), () => replacements[r]);
    });

    let output;
    try {
      output = JSON.parse(substituted);
    } catch(err) {
      throw new Error("There were errors in the CloudFormation template after building it.");
    }

    return output;
  }
}

module.exports = { Gatefold };
