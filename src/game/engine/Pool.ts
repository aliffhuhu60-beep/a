/** Generic object pool: avoids allocation (and GC hitches) while running. */
export class Pool<T> {
  private free: T[] = [];
  private created = 0;

  constructor(
    private readonly factory: () => T,
    private readonly onAcquire?: (item: T) => void,
    private readonly onRelease?: (item: T) => void,
  ) {}

  prewarm(count: number): void {
    const items: T[] = [];
    for (let i = 0; i < count; i++) items.push(this.acquire());
    for (const item of items) this.release(item);
  }

  acquire(): T {
    const item = this.free.pop() ?? this.create();
    this.onAcquire?.(item);
    return item;
  }

  release(item: T): void {
    this.onRelease?.(item);
    this.free.push(item);
  }

  get size(): number {
    return this.created;
  }

  get available(): number {
    return this.free.length;
  }

  private create(): T {
    this.created++;
    return this.factory();
  }
}
