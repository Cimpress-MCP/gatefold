#!/usr/bin/env node

const commander = require("commander");
const cfn = require("cfn");
const aws = require("aws-sdk");
const path = require("path");
const util = require("util");

const { Gatefold } = require(path.join(__dirname, "../index"));

const swaggerPath = path.join(__dirname, "../src/swagger.json");
const cloudformationPath = path.join(__dirname, "../src/gatefold.template");
const version = require(path.join(__dirname, "../package.json")).version;

const configureAWS = (profile, region) => {
  aws.config.credentials = new aws.SharedIniFileCredentials({profile: profile || "default"});
  aws.config.region = region || aws.config.region;
};

const makeStackName = domain => `Gatefold-${domain.replace(new RegExp("\\.", "g"), "-")}`;
const resolvePath = (pathToFile) => pathToFile ? path.resolve(pathToFile) : null;

commander.version(version);

commander
  .command("deploy <domain>")
  .description("Create or update a Gatefold stack")
  .option("-r, --region <region>", "select another AWS region")
  .option("-p, --profile <profile>", "select another AWS profile")
  .option("-t, --ttl <ttl>", "provide a TTL in days", "3650")
  .option("-x, --external-swagger-transform <file>", "Transform public Swagger with a Node.js script\n")
  .action((domain, options) => {
    configureAWS(options.profile, options.region);

    let name = makeStackName(domain);
    let { ttl, externalSwaggerTransform } = options;
    externalSwaggerTransform = resolvePath(externalSwaggerTransform);

    let gatefold = new Gatefold(swaggerPath, cloudformationPath);
    let template = gatefold.build(false, domain, ttl, externalSwaggerTransform);

    cfn({
      name,
      capabilities: ["CAPABILITY_NAMED_IAM"]
    }, template)
      .then(() => console.log("Done!"))
      .catch(err => {
        console.error(err.message);
        process.exit(1);
      });
  });

commander
  .command("get-swagger <domain>")
  .description("Build and return a Gatefold Swagger API definition")
  .option("-t, --ttl <ttl>", "provide a TTL in days", "3650")
  .option("-s, --scrub-aws", "remove AWS integration options", false)
  .option("-x, --external-swagger-transform <file>", "Transform public Swagger with a Node.js script\n")
  .action((domain, options) => {
    let { ttl, scrubAws, externalSwaggerTransform } = options;
    externalSwaggerTransform = resolvePath(externalSwaggerTransform);

    let gatefold = new Gatefold(swaggerPath, cloudformationPath);
    let swagger = gatefold.buildSwagger(scrubAws, domain, ttl, externalSwaggerTransform);
    console.log(JSON.stringify(swagger, null, 4));
  });

commander
  .command("get-cloudformation <domain>")
  .description("Build and return a Gatefold Cloudformation template")
  .option("-t, --ttl <ttl>", "provide a TTL in days", "3650")
  .option("-x, --external-swagger-transform <file>", "Transform public Swagger with a Node.js script\n")
  .action((domain, options) => {
    let { ttl, externalSwaggerTransform } = options;
    externalSwaggerTransform = resolvePath(externalSwaggerTransform);

    let gatefold = new Gatefold(swaggerPath, cloudformationPath);

    let template = gatefold.build(false, domain, ttl, externalSwaggerTransform);
    console.log(JSON.stringify(template, null, 4));
  });

commander
  .command("delete <domain>")
  .description("Delete a Gatefold stack")
  .option("-r, --region <region>", "select another AWS region")
  .option("-p, --profile <profile>", "select another AWS profile\n")
  .action((domain, options) => { configureAWS(options.profile, options.region); 
    let name = makeStackName(domain);

    cfn.delete(name)
      .then(() => console.log(`Stack ${name} has been removed.`))
      .catch(err => {
        console.error(err.message);
        process.exit(1);
      });
  });

commander.parse(process.argv);
