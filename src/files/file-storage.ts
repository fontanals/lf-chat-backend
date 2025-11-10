import {
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { config } from "../config";
import { s3Client } from "./s3-client";
import { ArrayUtils } from "../utils/arrays";

export interface IFileStorage {
  readFile(key: string): Promise<Buffer>;
  writeFile(key: string, mimetype: string, data: Buffer): Promise<void>;
  deleteFile(key: string): Promise<void>;
  deleteFiles(keys: string[]): Promise<void>;
}

export class FileStorage implements IFileStorage {
  async readFile(key: string): Promise<Buffer> {
    const command = new GetObjectCommand({
      Bucket: config.AWS_S3_BUCKET_NAME,
      Key: key,
    });

    const output = await s3Client.send(command);

    if (output.Body == null) {
      throw new Error(`File with key ${key} not found in S3 bucket.`);
    }

    const content = await output.Body.transformToByteArray();

    return Buffer.from(content);
  }

  async writeFile(key: string, mimetype: string, data: Buffer): Promise<void> {
    const command = new PutObjectCommand({
      Bucket: config.AWS_S3_BUCKET_NAME,
      Key: key,
      ContentType: mimetype,
      Body: data,
    });

    await s3Client.send(command);
  }

  async deleteFile(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: config.AWS_S3_BUCKET_NAME,
      Key: key,
    });

    await s3Client.send(command);
  }

  async deleteFiles(keys: string[]): Promise<void> {
    if (ArrayUtils.isNullOrEmpty(keys)) {
      return;
    }

    const command = new DeleteObjectsCommand({
      Bucket: config.AWS_S3_BUCKET_NAME,
      Delete: { Objects: keys.map((key) => ({ Key: key })) },
    });

    await s3Client.send(command);
  }
}
