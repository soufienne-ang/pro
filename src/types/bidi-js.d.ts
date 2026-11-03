declare module "bidi-js" {
  interface EmbeddingLevelsResult {
    paragraphs: Array<{ start: number; end: number; level: number }>;
    levels: number[];
  }
  interface BidiAPI {
    getEmbeddingLevels(str: string): EmbeddingLevelsResult;
    getReorderedString(
      str: string,
      embedLevelsResult: EmbeddingLevelsResult,
      start?: number,
      end?: number
    ): string;
  }
  function bidiFactory(): BidiAPI;
  export default bidiFactory;
}
