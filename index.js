"use strict";

const fs = require("fs");
const cloneDeep = require("lodash.clonedeep");

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

  build(scrubAws, domain, ttl) {
    return this.buildCloudformationTemplate(this.buildSwagger(scrubAws, domain, ttl), domain);
  }

  setSwaggerRouteResponse(swaggerObject) {
    let publicSwagger = cloneDeep(swaggerObject);

    dfsScrubKey(publicSwagger, "x-amazon-apigateway");
    delete publicSwagger.paths["/{id}/proxied"];
    delete publicSwagger.paths["/not-found"];

    swaggerObject.paths["/swagger"].get["x-amazon-apigateway-integration"].responses.default.responseTemplates["application/json"] = JSON.stringify(publicSwagger);
  }

  buildSwagger(scrubAws, domain, ttl) {
    const replacements = {
      "GATEFOLD_DOMAIN": domain,
      "GATEFOLD_TTL": ttl
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

    this.setSwaggerRouteResponse(materialization);

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
