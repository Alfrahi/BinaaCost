import { pb } from "../client";
import { mapRecord, mapRecords } from "../mappers";
import { RecordListOptions } from "pocketbase";

export interface PaginationOptions {
  page?: number;
  perPage?: number;
  filter?: string;
  sort?: string;
  expand?: string;
  fields?: string;
}

export interface PaginatedResult<T> {
  page: number;
  perPage: number;
  totalItems: number;
  totalPages: number;
  items: T[];
}

export class BaseRepository<T extends object = Record<string, unknown>> {
  constructor(protected readonly collectionName: string) {}

  protected get collection() {
    return pb.collection(this.collectionName);
  }

  async getById(id: string, options?: { expand?: string; fields?: string }): Promise<T & { id: string }> {
    const record = await this.collection.getOne(id, options);
    return mapRecord<T>(record);
  }

  async getFullList(options?: RecordListOptions): Promise<Array<T & { id: string }>> {
    const records = await this.collection.getFullList(options);
    return mapRecords<T>(records);
  }

  async getList(
    page: number = 1,
    perPage: number = 50,
    options?: RecordListOptions,
  ): Promise<PaginatedResult<T & { id: string }>> {
    const res = await this.collection.getList(page, perPage, options);
    return {
      page: res.page,
      perPage: res.perPage,
      totalItems: res.totalItems,
      totalPages: res.totalPages,
      items: mapRecords<T>(res.items),
    };
  }

  async getFirstListItem(
    filter: string,
    options?: RecordListOptions,
  ): Promise<(T & { id: string }) | null> {
    try {
      const record = await this.collection.getFirstListItem(filter, options);
      return mapRecord<T>(record);
    } catch (err: unknown) {
      const status = typeof err === "object" && err !== null && "status" in err ? (err as any).status : null;
      if (status === 404) return null;
      throw err;
    }
  }

  async create(data: Partial<T> | FormData, options?: RecordListOptions): Promise<T & { id: string }> {
    const record = await this.collection.create(data as any, options);
    return mapRecord<T>(record);
  }

  async update(id: string, data: Partial<T> | FormData, options?: RecordListOptions): Promise<T & { id: string }> {
    const record = await this.collection.update(id, data as any, options);
    return mapRecord<T>(record);
  }

  async delete(id: string): Promise<boolean> {
    return await this.collection.delete(id);
  }
}
