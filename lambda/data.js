'use strict';

const { S3 } = require('aws-sdk');

exports.handler = async function (event) {
  const headers = {
    'Access-Control-Allow-Origin': process.env.ACCESS_CONTROL_ALLOW_ORIGIN,
    'Access-Control-Allow-Credentials': true,
  };

  const s3 = new S3({ region: process.env.BUCKET_REGION });

  try {
    const data = await s3
      .getObject({
        Bucket: process.env.DATA_BUCKET_NAME,
        Key: process.env.BUCKET_OBJECT_KEY,
      })
      .promise();

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(JSON.parse(data.Body)),
    };
  } catch (err) {
    return {
      statusCode: err.statusCode || 500,
      headers,
      body: err.message || JSON.stringify(err.message),
    };
  }
};
