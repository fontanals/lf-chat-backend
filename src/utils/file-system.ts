import fs from "fs/promises";

export class FileSystemUtils {
  static async ensureDirectoryExists(path: string): Promise<void> {
    try {
      await fs.access(path);
    } catch (error) {
      await fs.mkdir(path, { recursive: true });
    }
  }

  static async writeFile(path: string, data: Buffer): Promise<void> {
    await fs.writeFile(path, data);
  }

  static async readFile(path: string): Promise<Buffer> {
    return await fs.readFile(path);
  }

  static async removeFile(path: string): Promise<void> {
    await fs.unlink(path);
  }
}
