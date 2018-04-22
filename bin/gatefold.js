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

commander.version(version);

commander
  .command("deploy <domain>")
  .description("Create or update a Gatefold stack")
  .option("-r, --region <region>", "select another AWS region")
  .option("-p, --profile <profile>", "select another AWS profile\n")
  .option("-t, --ttl <ttl>", "provide a TTL in days", "3650")
  .action((domain, options) => {
    configureAWS(options.profile, options.region);

    let name = makeStackName(domain);
    let ttl = options["ttl"];

    let gatefold = new Gatefold(swaggerPath, cloudformationPath);
    let template = gatefold.build(false, domain, ttl);

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
  .action((domain, options) => {
    let ttl = options["ttl"];
    let scrubAws = options["scrubAws"];

    let gatefold = new Gatefold(swaggerPath, cloudformationPath);
    let swagger = gatefold.buildSwagger(scrubAws, domain, ttl);
    console.log(JSON.stringify(swagger, null, 4));
  });

commander
  .command("get-cloudformation <domain>")
  .description("Build and return a Gatefold Cloudformation template")
  .option("-t, --ttl <ttl>", "provide a TTL in days", "3650")
  .action((domain, options) => {
    let ttl = options["ttl"];

    let gatefold = new Gatefold(swaggerPath, cloudformationPath);

    let template = gatefold.build(false, domain, ttl);
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
