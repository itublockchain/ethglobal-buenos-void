declare module 'level-rocksdb' {
  interface LevelDB {
    get(key: string): Promise<string>;
    put(key: string, value: string): Promise<void>;
    del(key: string): Promise<void>;
    close(): Promise<void>;
    createReadStream(options?: {
      gte?: string;
      lte?: string;
      lt?: string;
      gt?: string;
      reverse?: boolean;
      limit?: number;
    }): NodeJS.ReadableStream;
  }

  function level(location: string): LevelDB;
  export default level;
}
