# Gatefold

[![npm version](https://badge.fury.io/js/gatefold.svg)](https://badge.fury.io/js/gatefold)

Gatefold is a quick to set up, simple to use URL shortener built with Amazon API Gateway and Amazon DynamoDB and codified with Amazon CloudFormation.

Features:
- deploy a URL shortener to your AWS account in **five seconds**!
- shorten URLs and store a token to change it later
- create vanity URLs by passing custom strings
- specify a TTL for all shortened URLs on the domain.

The entire setup is bootstrapped with a CLI tool written in Node.js, which allows you to deploy or delete Gatefold stacks for several domains in multiple AWS accounts and regions. It is also possible to print the pre-populated API definition or the CloudFormation template to standard output for external processing.

No computing engines apart from API Gateway's VTL mapping templates are used, where all logic is stored.

## Getting Started

Install the [Gatefold package](https://www.npmjs.com/package/gatefold) using npm or yarn:
```
npm install -g gatefold
```
To check your installation, run `gatefold --version`.

Now that you've installed Gatefold, you can deploy your custom URL shortener service:
```
gatefold deploy example.org
```
This will create a new Gatefold stack in your default AWS account and region. To change the target, use `--profile <profile>` and `--region <region>`:
```
gatefold deploy \
  --profile my-other-profile \
  --region eu-west-1 \
  example.org
```
Afterwards, [set up a custom domain name](https://docs.aws.amazon.com/apigateway/latest/developerguide/how-to-custom-domains.html) and [add an ALIAS record](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resource-record-sets-creating.html) for the Amazon CloudFront distribution to hook it up to your domain. Both operations are easily achievable in the web console.

Wait for it to become available:
```
    until host example.org | grep address; do sleep 5; done \
      && echo "It's up!"
```

## Consuming the API

Create your first shortened URL:
```
POST  HTTP/1.1
Host: example.org
Content-Type: application/json

{
  "longUrl": "https://cimpress.com"
}
```

The server responds with the shortened URL and a token:
```
HTTP/1.1 201 Created
Content-Type: application/json
Location: https://example.org/f530e741
{
    "longUrl": "https://cimpress.com",
    "shortUrl": "https://example.org/f530e741",
    "token": "a2354cd3-463e-11e8-ad00-8a820fb8b897"
}
```

You can also create a vanity URL passing a custom string:
```
PUT /gatefold HTTP/1.1
Host: example.org
Content-Type: application/json

{
  "longUrl": "https://cimpress.com",
  "token": "vas12tmsuo"
}
```
Update it by repeating the request with the same token.

## Commands
You can see more information about a command by passing `--help` to the command, e.g. `gatefold deploy --help`.

##### gatefold deploy **domain**
Creates a new Gatefold stack in your AWS account or updates an existing one.

Specify TTL in days with `--ttl <ttl>`. The default is 3650, i.e. ten years.

##### gatefold delete **domain**
Deletes a Gatefold stack from your AWS account.

For `gatefold deploy` and `gatefold delete` possible to switch your default AWS account or region by passing `--profile <profile>` and `--region <region>` respectively.

##### gatefold get-swagger **domain**
Builds the Swagger API definition for Gatefold and prints it to standard output.

Specify TTL in days with `--ttl <ttl>`. The default is 3650, i.e. ten years.


##### gatefold get-cloudformation **domain**
Builds the CloudFormation template for Gatefold and prints it to standard output.

Specify TTL in days with `--ttl <ttl>`. The default is 3650, i.e. ten years.

## Built With

* [commander.js](https://github.com/tj/commander.js/) - Node.js CLI framework
* [cfn](https://github.com/Nordstrom/cfn) - Amazon CloudFormation automation
* [Swagger 2.0](https://github.com/OAI/OpenAPI-Specification/blob/master/versions/2.0.md) - RESTful API description
* [Amazon API Gateway](https://aws.amazon.com/api-gateway/) - reliable API publishing
* [Amazon DynamoDB](https://aws.amazon.com/dynamodb/) - low-cost NoSQL document store
* [Amazon CloudFormation](https://aws.amazon.com/cloudformation/) - Infrastructure-as-Code (IaC), Infrastructure-as-a-Service (IaaS) solution

## Contributing

Have you benefited from the tool? Have you found or fixed a bug? Would you like to see a new feature implemented? We are eager to collaborate with you on GitHub.

## Versioning

We use [SemVer](http://semver.org/) for versioning. For the versions available, see the [tags on this repository](https://github.com/your/project/tags). 

## Authors

* **Igor Sowinski** <[isowinski@cimpress.com](mailto:isowinski@cimpress.com), [igor@sowinski.blue](mailto:igor@sowinski.blue)> - [GitHub](https://github.com/Igrom)

See also the list of [contributors](https://github.com/your/project/contributors) who participated in this project.

## License

This project is licensed under the Apache 2.0 license - see the [LICENSE.md](LICENSE.md) file for details.
