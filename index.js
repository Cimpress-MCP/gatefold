"use strict";

const fs = require("fs");

const dfsScrubAws = obj => {
  Object.keys(obj).map(k => {
    if (k.startsWith("x-amazon")) {
      delete obj[k];
      return;
    }

    if (typeof obj[k] === "object") {
      dfsScrubAws(obj[k])
    }
  });
};

class Gatefold {
  constructor(swaggerPath, cloudformationPath) {
    this.swag = fs.readFileSync(swaggerPath).toString();
    this.cl = fs.readFileSync(cloudformationPath).toString();
  }

  build(scrubAws, region, domain, ttl, contact) {
    return this.buildCloudformationTemplate(this.buildSwagger(scrubAws, region, domain, ttl, contact), domain);
  }

  buildSwagger(scrubAws, region, domain, ttl, contact) {
    const replacements = {
      "GATEFOLD_DOMAIN": domain,
      "GATEFOLD_TTL": ttl,
      "CONTACT_NAME": contact.name,
      "CONTACT_EMAIL": contact.email,
      "REGION": region
    };

    let substituted = this.swag;
    Object.keys(replacements).map(r => {
      substituted = substituted.replace(new RegExp(`\\$${r}`, "g"), () => replacements[r]);
    });

    let output;
    try {
      output = JSON.parse(substituted);
    } catch(err) {
      throw new Error("There were errors in the Swagger API definition after building it.");
    }

    if (scrubAws) {
      dfsScrubAws(output);
    }

    return output;
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
