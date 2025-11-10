import { FileStorage } from "../../../src/files/file-storage";

describe("FileStorage", () => {
  const fileStorage = new FileStorage();

  let mockFiles = Array.from({ length: 5 }, (_, index) => ({
    key: `test/file-${index + 1}.txt`,
    contentType: "text/plain",
    content: `File ${index + 1} content`,
  }));

  beforeAll(async () => {
    await Promise.all(
      mockFiles.map((file) =>
        fileStorage.writeFile(
          file.key,
          file.contentType,
          Buffer.from(file.content)
        )
      )
    );
  });

  describe("readFile", () => {
    it("should read file", async () => {
      const mockFile = mockFiles[0];

      const content = await fileStorage.readFile(mockFile.key);

      expect(content.toString()).toBe(mockFile.content);
    });
  });

  describe("writeFile", () => {
    it("should write new file", async () => {
      const newFile = {
        key: "test/new-file.txt",
        contentType: "text/plain",
        content: "New file content",
      };

      await fileStorage.writeFile(
        newFile.key,
        newFile.contentType,
        Buffer.from(newFile.content)
      );

      mockFiles.push(newFile);

      const content = await fileStorage.readFile(newFile.key);

      expect(content.toString()).toBe(newFile.content);
    });
  });

  describe("deleteFile", () => {
    it("should delete file", async () => {
      const mockFile = mockFiles[mockFiles.length - 1];

      await fileStorage.deleteFile(mockFile.key);

      mockFiles = mockFiles.slice(0, -1);
    });
  });

  describe("deleteFiles", () => {
    it("should delete multiple files", async () => {
      await fileStorage.deleteFiles(mockFiles.map((file) => file.key));
    });
  });
});
