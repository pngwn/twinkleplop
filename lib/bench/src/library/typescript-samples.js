// TypeScript samples of varying complexity for benchmarking.
// Sized to match the JS samples so the side-by-side comparison is fair.
//
// These intentionally exercise the features the reclassifiers care about:
//   - interface members (interface_member_promoter)
//   - class fields with default values (class field exclusion rule)
//   - typed function parameters (no false-positive promotions)
//   - tagged templates (HTML/CSS embedding pipeline)
// so the bench reflects real-world TypeScript work, not just plain JS in
// disguise.

export const tiny_ts = `const x: number = 42;`;

export const small_ts = `// Small typed module: an interface, a class, a typed arrow function.
interface User {
	id: number;
	name: string;
	email?: string;
}

class UserService {
	private cache: Map<number, User> = new Map();

	get(id: number): User | undefined {
		return this.cache.get(id);
	}
}

const service = new UserService();
const user: User | undefined = service.get(1);
`;

export const medium_ts = `// React-style component in TypeScript with hooks, generics, and interfaces.
import React, { useState, useEffect, useCallback } from "react";
import { fetchUserData, updateProfile } from "./api";

interface User {
	id: number;
	name: string;
	email: string;
	verified: boolean;
}

interface UpdateResult {
	success: boolean;
	error?: string;
}

interface Props<T extends User> {
	userId: number;
	onUpdate?: (user: T) => void;
}

const UserProfile = <T extends User>({ userId, onUpdate }: Props<T>) => {
	const [user, setUser] = useState<T | null>(null);
	const [loading, setLoading] = useState<boolean>(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		async function loadUser(): Promise<void> {
			try {
				setLoading(true);
				const data: T = await fetchUserData(userId);
				setUser(data);
			} catch (err: unknown) {
				setError(err instanceof Error ? err.message : "Unknown error");
			} finally {
				setLoading(false);
			}
		}
		loadUser();
	}, [userId]);

	const handleUpdate = useCallback(
		async (updates: Partial<T>): Promise<UpdateResult> => {
			try {
				const updated: T = await updateProfile(userId, updates);
				setUser(updated);
				onUpdate?.(updated);
				return { success: true };
			} catch (error: unknown) {
				return {
					success: false,
					error: error instanceof Error ? error.message : "Unknown error",
				};
			}
		},
		[userId, onUpdate],
	);

	if (loading) return <div>Loading...</div>;
	if (error) return <div>Error: {error}</div>;

	return (
		<div className="user-profile">
			<h1>{user?.name ?? "Anonymous"}</h1>
			<p>{user?.email}</p>
			<button onClick={() => handleUpdate({ verified: true } as Partial<T>)}>
				Verify Account
			</button>
		</div>
	);
};

export default UserProfile;
`;

export const large_ts = `// A realistic chunk of TypeScript: a small repository pattern with
// generics, decorators, abstract base, mixed class fields, interfaces with
// many members. Sized to ~150 lines to match large_js.
import { Logger, type LogLevel } from "./logger";

const log = new Logger();

// ---------------------------------------------------------------------------
// Domain types
// ---------------------------------------------------------------------------

export type EntityId = string & { readonly __brand: "EntityId" };

export interface Entity {
	readonly id: EntityId;
	readonly createdAt: Date;
	readonly updatedAt: Date;
}

export interface User extends Entity {
	name: string;
	email: string;
	verified: boolean;
	roles: ReadonlyArray<Role>;
}

export interface Role {
	name: string;
	permissions: ReadonlyArray<string>;
}

export interface Repository<T extends Entity> {
	find(id: EntityId): Promise<T | undefined>;
	findMany(predicate: (entity: T) => boolean): Promise<T[]>;
	save(entity: T): Promise<T>;
	delete(id: EntityId): Promise<boolean>;
}

// ---------------------------------------------------------------------------
// Decorators
// ---------------------------------------------------------------------------

function logged(level: LogLevel = "info") {
	return function <This, Args extends unknown[], Return>(
		target: (this: This, ...args: Args) => Return,
		context: ClassMethodDecoratorContext<
			This,
			(this: This, ...args: Args) => Return
		>,
	) {
		return function (this: This, ...args: Args): Return {
			log[level](\`Calling \${String(context.name)}\`);
			const result = target.call(this, ...args);
			log[level](\`Returned from \${String(context.name)}\`);
			return result;
		};
	};
}

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

export abstract class BaseRepository<T extends Entity> implements Repository<T> {
	protected readonly cache: Map<EntityId, T> = new Map();
	protected loaded: boolean = false;
	private fetchCount: number = 0;

	abstract find(id: EntityId): Promise<T | undefined>;

	@logged("debug")
	async findMany(predicate: (entity: T) => boolean): Promise<T[]> {
		await this.ensureLoaded();
		return Array.from(this.cache.values()).filter(predicate);
	}

	async save(entity: T): Promise<T> {
		this.cache.set(entity.id, entity);
		return entity;
	}

	async delete(id: EntityId): Promise<boolean> {
		return this.cache.delete(id);
	}

	protected async ensureLoaded(): Promise<void> {
		if (this.loaded) return;
		await this.loadAll();
		this.loaded = true;
	}

	protected abstract loadAll(): Promise<void>;
}

export class UserRepository extends BaseRepository<User> {
	@logged()
	async find(id: EntityId): Promise<User | undefined> {
		const cached = this.cache.get(id);
		if (cached) return cached;
		const user = await this.fetchById(id);
		if (user) this.cache.set(id, user);
		return user;
	}

	private async fetchById(id: EntityId): Promise<User | undefined> {
		const response = await fetch(\`/api/users/\${id}\`);
		if (!response.ok) return undefined;
		const data: User = await response.json();
		return data;
	}

	protected async loadAll(): Promise<void> {
		const response = await fetch("/api/users");
		const users: User[] = await response.json();
		for (const user of users) {
			this.cache.set(user.id, user);
		}
	}

	async findByRole(roleName: string): Promise<User[]> {
		return this.findMany((u: User) =>
			u.roles.some((r: Role) => r.name === roleName),
		);
	}
}

const repo = new UserRepository();
const admins: User[] = await repo.findByRole("admin");
log.info(\`Found \${admins.length} admins\`);
`;

export const complex_ts = `// Complex TypeScript exercising many features at once: conditional
// types, mapped types, recursive types, template literal types, decorators,
// abstract classes, generics with constraints, intersection / union types,
// and dense interface declarations. Sized to roughly mirror complex_js.
"use strict";

// ---------------------------------------------------------------------------
// Brand types and template literal types
// ---------------------------------------------------------------------------

export type Brand<T, B> = T & { readonly __brand: B };
export type UserId = Brand<string, "UserId">;
export type OrderId = Brand<string, "OrderId">;
export type Email = Brand<string, "Email"> & \`\${string}@\${string}\`;

export type Path<O, K extends keyof O = keyof O> = K extends string
	? O[K] extends Record<string, unknown>
		? \`\${K}.\${Path<O[K]>}\` | K
		: K
	: never;

// ---------------------------------------------------------------------------
// Conditional / mapped types
// ---------------------------------------------------------------------------

export type DeepReadonly<T> = T extends (...args: unknown[]) => unknown
	? T
	: T extends object
		? { readonly [K in keyof T]: DeepReadonly<T[K]> }
		: T;

export type DeepPartial<T> = T extends object
	? { [K in keyof T]?: DeepPartial<T[K]> }
	: T;

export type NonNullableKeys<T> = {
	[K in keyof T]: null extends T[K] ? never : K;
}[keyof T];

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

// ---------------------------------------------------------------------------
// Domain interfaces
// ---------------------------------------------------------------------------

export interface User {
	readonly id: UserId;
	name: string;
	email: Email;
	createdAt: Date;
	updatedAt: Date;
	preferences: UserPreferences;
	roles: readonly Role[];
}

export interface UserPreferences {
	theme: "light" | "dark" | "system";
	notifications: {
		email: boolean;
		push: boolean;
		digest: "daily" | "weekly" | "never";
	};
	language: string;
}

export interface Role {
	readonly id: string;
	name: string;
	permissions: ReadonlyArray<Permission>;
}

export interface Permission {
	resource: string;
	actions: ReadonlyArray<"read" | "write" | "delete">;
}

export interface Order {
	readonly id: OrderId;
	userId: UserId;
	items: OrderItem[];
	status: OrderStatus;
	total: number;
	createdAt: Date;
}

export interface OrderItem {
	productId: string;
	quantity: number;
	price: number;
}

export type OrderStatus =
	| { kind: "pending" }
	| { kind: "confirmed"; confirmedAt: Date }
	| { kind: "shipped"; trackingNumber: string }
	| { kind: "delivered"; deliveredAt: Date }
	| { kind: "cancelled"; reason: string };

// ---------------------------------------------------------------------------
// Decorators
// ---------------------------------------------------------------------------

function memoize<This, Args extends unknown[], Return>(
	target: (this: This, ...args: Args) => Return,
	context: ClassMethodDecoratorContext<
		This,
		(this: This, ...args: Args) => Return
	>,
) {
	const cache = new WeakMap<object, Map<string, Return>>();
	return function (this: This, ...args: Args): Return {
		const ref = (this as unknown as object) ?? memoize;
		let bucket = cache.get(ref);
		if (!bucket) {
			bucket = new Map();
			cache.set(ref, bucket);
		}
		const key = JSON.stringify(args);
		if (bucket.has(key)) {
			return bucket.get(key) as Return;
		}
		const result = target.call(this, ...args);
		bucket.set(key, result);
		return result;
	};
}

function deprecated(message: string) {
	return function <This, Args extends unknown[], Return>(
		target: (this: This, ...args: Args) => Return,
		context: ClassMethodDecoratorContext,
	) {
		return function (this: This, ...args: Args): Return {
			console.warn(\`[deprecated] \${String(context.name)}: \${message}\`);
			return target.call(this, ...args);
		};
	};
}

// ---------------------------------------------------------------------------
// Service classes with mixed members
// ---------------------------------------------------------------------------

export abstract class Service<T extends { id: string }> {
	protected readonly storage: Map<string, T> = new Map();
	protected created: number = 0;
	protected lastAccess: Date = new Date();
	private fetchCount: number = 0;

	abstract validate(entity: T): boolean;
	abstract serialize(entity: T): string;

	@memoize
	get(id: string): T | undefined {
		this.lastAccess = new Date();
		return this.storage.get(id);
	}

	create(entity: T): T {
		if (!this.validate(entity)) {
			throw new Error(\`Invalid entity: \${this.serialize(entity)}\`);
		}
		this.storage.set(entity.id, entity);
		this.created += 1;
		return entity;
	}

	@deprecated("Use createMany instead")
	createBatch(entities: T[]): T[] {
		return entities.map((e: T) => this.create(e));
	}

	createMany(entities: ReadonlyArray<T>): T[] {
		return entities.map((e: T) => this.create(e));
	}

	delete(id: string): boolean {
		return this.storage.delete(id);
	}

	async exportAll(): Promise<string> {
		const lines: string[] = [];
		for (const entity of this.storage.values()) {
			lines.push(this.serialize(entity));
		}
		return lines.join("\\n");
	}
}

export class UserService extends Service<User> {
	private emailIndex: Map<Email, UserId> = new Map();

	validate(user: User): boolean {
		return user.name.length > 0 && user.email.includes("@");
	}

	serialize(user: User): string {
		return JSON.stringify({ id: user.id, name: user.name, email: user.email });
	}

	@memoize
	findByEmail(email: Email): User | undefined {
		const id = this.emailIndex.get(email);
		return id ? this.get(id as string) : undefined;
	}

	registerEmail(email: Email, id: UserId): void {
		this.emailIndex.set(email, id);
	}
}

// ---------------------------------------------------------------------------
// Generic utilities
// ---------------------------------------------------------------------------

export function pipe<A, B>(f: (a: A) => B): (a: A) => B;
export function pipe<A, B, C>(f: (a: A) => B, g: (b: B) => C): (a: A) => C;
export function pipe<A, B, C, D>(
	f: (a: A) => B,
	g: (b: B) => C,
	h: (c: C) => D,
): (a: A) => D;
export function pipe(...fns: Array<(x: unknown) => unknown>) {
	return (x: unknown) => fns.reduce((acc, fn) => fn(acc), x);
}

export function curry<A, B, C>(fn: (a: A, b: B) => C): (a: A) => (b: B) => C {
	return (a: A) => (b: B) => fn(a, b);
}

export async function* batches<T>(
	items: AsyncIterable<T>,
	size: number,
): AsyncGenerator<T[]> {
	let batch: T[] = [];
	for await (const item of items) {
		batch.push(item);
		if (batch.length >= size) {
			yield batch;
			batch = [];
		}
	}
	if (batch.length > 0) yield batch;
}

// ---------------------------------------------------------------------------
// Tagged templates and runtime use
// ---------------------------------------------------------------------------

const sql = (strings: TemplateStringsArray, ...values: unknown[]): string =>
	strings.reduce((acc, s, i) => acc + s + (values[i] ?? ""), "");

const userId: UserId = "u_123" as UserId;
const query = sql\`SELECT * FROM users WHERE id = \${userId}\`;

const service = new UserService();
const user: User | undefined = service.get(userId as string);
if (user) service.registerEmail(user.email, user.id);

export default UserService;

// Complex TypeScript exercising many features at once: conditional
// types, mapped types, recursive types, template literal types, decorators,
// abstract classes, generics with constraints, intersection / union types,
// and dense interface declarations. Sized to roughly mirror complex_js.
"use strict";

// ---------------------------------------------------------------------------
// Brand types and template literal types
// ---------------------------------------------------------------------------

export type Brand<T, B> = T & { readonly __brand: B };
export type UserId = Brand<string, "UserId">;
export type OrderId = Brand<string, "OrderId">;
export type Email = Brand<string, "Email"> & \`\${string}@\${string}\`;

export type Path<O, K extends keyof O = keyof O> = K extends string
	? O[K] extends Record<string, unknown>
		? \`\${K}.\${Path<O[K]>}\` | K
		: K
	: never;

// ---------------------------------------------------------------------------
// Conditional / mapped types
// ---------------------------------------------------------------------------

export type DeepReadonly<T> = T extends (...args: unknown[]) => unknown
	? T
	: T extends object
		? { readonly [K in keyof T]: DeepReadonly<T[K]> }
		: T;

export type DeepPartial<T> = T extends object
	? { [K in keyof T]?: DeepPartial<T[K]> }
	: T;

export type NonNullableKeys<T> = {
	[K in keyof T]: null extends T[K] ? never : K;
}[keyof T];

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

// ---------------------------------------------------------------------------
// Domain interfaces
// ---------------------------------------------------------------------------

export interface User {
	readonly id: UserId;
	name: string;
	email: Email;
	createdAt: Date;
	updatedAt: Date;
	preferences: UserPreferences;
	roles: readonly Role[];
}

export interface UserPreferences {
	theme: "light" | "dark" | "system";
	notifications: {
		email: boolean;
		push: boolean;
		digest: "daily" | "weekly" | "never";
	};
	language: string;
}

export interface Role {
	readonly id: string;
	name: string;
	permissions: ReadonlyArray<Permission>;
}

export interface Permission {
	resource: string;
	actions: ReadonlyArray<"read" | "write" | "delete">;
}

export interface Order {
	readonly id: OrderId;
	userId: UserId;
	items: OrderItem[];
	status: OrderStatus;
	total: number;
	createdAt: Date;
}

export interface OrderItem {
	productId: string;
	quantity: number;
	price: number;
}

export type OrderStatus =
	| { kind: "pending" }
	| { kind: "confirmed"; confirmedAt: Date }
	| { kind: "shipped"; trackingNumber: string }
	| { kind: "delivered"; deliveredAt: Date }
	| { kind: "cancelled"; reason: string };

// ---------------------------------------------------------------------------
// Decorators
// ---------------------------------------------------------------------------

function memoize<This, Args extends unknown[], Return>(
	target: (this: This, ...args: Args) => Return,
	context: ClassMethodDecoratorContext<
		This,
		(this: This, ...args: Args) => Return
	>,
) {
	const cache = new WeakMap<object, Map<string, Return>>();
	return function (this: This, ...args: Args): Return {
		const ref = (this as unknown as object) ?? memoize;
		let bucket = cache.get(ref);
		if (!bucket) {
			bucket = new Map();
			cache.set(ref, bucket);
		}
		const key = JSON.stringify(args);
		if (bucket.has(key)) {
			return bucket.get(key) as Return;
		}
		const result = target.call(this, ...args);
		bucket.set(key, result);
		return result;
	};
}

function deprecated(message: string) {
	return function <This, Args extends unknown[], Return>(
		target: (this: This, ...args: Args) => Return,
		context: ClassMethodDecoratorContext,
	) {
		return function (this: This, ...args: Args): Return {
			console.warn(\`[deprecated] \${String(context.name)}: \${message}\`);
			return target.call(this, ...args);
		};
	};
}

// ---------------------------------------------------------------------------
// Service classes with mixed members
// ---------------------------------------------------------------------------

export abstract class Service<T extends { id: string }> {
	protected readonly storage: Map<string, T> = new Map();
	protected created: number = 0;
	protected lastAccess: Date = new Date();
	private fetchCount: number = 0;

	abstract validate(entity: T): boolean;
	abstract serialize(entity: T): string;

	@memoize
	get(id: string): T | undefined {
		this.lastAccess = new Date();
		return this.storage.get(id);
	}

	create(entity: T): T {
		if (!this.validate(entity)) {
			throw new Error(\`Invalid entity: \${this.serialize(entity)}\`);
		}
		this.storage.set(entity.id, entity);
		this.created += 1;
		return entity;
	}

	@deprecated("Use createMany instead")
	createBatch(entities: T[]): T[] {
		return entities.map((e: T) => this.create(e));
	}

	createMany(entities: ReadonlyArray<T>): T[] {
		return entities.map((e: T) => this.create(e));
	}

	delete(id: string): boolean {
		return this.storage.delete(id);
	}

	async exportAll(): Promise<string> {
		const lines: string[] = [];
		for (const entity of this.storage.values()) {
			lines.push(this.serialize(entity));
		}
		return lines.join("\\n");
	}
}

export class UserService extends Service<User> {
	private emailIndex: Map<Email, UserId> = new Map();

	validate(user: User): boolean {
		return user.name.length > 0 && user.email.includes("@");
	}

	serialize(user: User): string {
		return JSON.stringify({ id: user.id, name: user.name, email: user.email });
	}

	@memoize
	findByEmail(email: Email): User | undefined {
		const id = this.emailIndex.get(email);
		return id ? this.get(id as string) : undefined;
	}

	registerEmail(email: Email, id: UserId): void {
		this.emailIndex.set(email, id);
	}
}

// ---------------------------------------------------------------------------
// Generic utilities
// ---------------------------------------------------------------------------

export function pipe<A, B>(f: (a: A) => B): (a: A) => B;
export function pipe<A, B, C>(f: (a: A) => B, g: (b: B) => C): (a: A) => C;
export function pipe<A, B, C, D>(
	f: (a: A) => B,
	g: (b: B) => C,
	h: (c: C) => D,
): (a: A) => D;
export function pipe(...fns: Array<(x: unknown) => unknown>) {
	return (x: unknown) => fns.reduce((acc, fn) => fn(acc), x);
}

export function curry<A, B, C>(fn: (a: A, b: B) => C): (a: A) => (b: B) => C {
	return (a: A) => (b: B) => fn(a, b);
}

export async function* batches<T>(
	items: AsyncIterable<T>,
	size: number,
): AsyncGenerator<T[]> {
	let batch: T[] = [];
	for await (const item of items) {
		batch.push(item);
		if (batch.length >= size) {
			yield batch;
			batch = [];
		}
	}
	if (batch.length > 0) yield batch;
}

// ---------------------------------------------------------------------------
// Tagged templates and runtime use
// ---------------------------------------------------------------------------

const sql = (strings: TemplateStringsArray, ...values: unknown[]): string =>
	strings.reduce((acc, s, i) => acc + s + (values[i] ?? ""), "");

const userId: UserId = "u_123" as UserId;
const query = sql\`SELECT * FROM users WHERE id = \${userId}\`;

const service = new UserService();
const user: User | undefined = service.get(userId as string);
if (user) service.registerEmail(user.email, user.id);

export default UserService;

// Complex TypeScript exercising many features at once: conditional
// types, mapped types, recursive types, template literal types, decorators,
// abstract classes, generics with constraints, intersection / union types,
// and dense interface declarations. Sized to roughly mirror complex_js.
"use strict";

// ---------------------------------------------------------------------------
// Brand types and template literal types
// ---------------------------------------------------------------------------

export type Brand<T, B> = T & { readonly __brand: B };
export type UserId = Brand<string, "UserId">;
export type OrderId = Brand<string, "OrderId">;
export type Email = Brand<string, "Email"> & \`\${string}@\${string}\`;

export type Path<O, K extends keyof O = keyof O> = K extends string
	? O[K] extends Record<string, unknown>
		? \`\${K}.\${Path<O[K]>}\` | K
		: K
	: never;

// ---------------------------------------------------------------------------
// Conditional / mapped types
// ---------------------------------------------------------------------------

export type DeepReadonly<T> = T extends (...args: unknown[]) => unknown
	? T
	: T extends object
		? { readonly [K in keyof T]: DeepReadonly<T[K]> }
		: T;

export type DeepPartial<T> = T extends object
	? { [K in keyof T]?: DeepPartial<T[K]> }
	: T;

export type NonNullableKeys<T> = {
	[K in keyof T]: null extends T[K] ? never : K;
}[keyof T];

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

// ---------------------------------------------------------------------------
// Domain interfaces
// ---------------------------------------------------------------------------

export interface User {
	readonly id: UserId;
	name: string;
	email: Email;
	createdAt: Date;
	updatedAt: Date;
	preferences: UserPreferences;
	roles: readonly Role[];
}

export interface UserPreferences {
	theme: "light" | "dark" | "system";
	notifications: {
		email: boolean;
		push: boolean;
		digest: "daily" | "weekly" | "never";
	};
	language: string;
}

export interface Role {
	readonly id: string;
	name: string;
	permissions: ReadonlyArray<Permission>;
}

export interface Permission {
	resource: string;
	actions: ReadonlyArray<"read" | "write" | "delete">;
}

export interface Order {
	readonly id: OrderId;
	userId: UserId;
	items: OrderItem[];
	status: OrderStatus;
	total: number;
	createdAt: Date;
}

export interface OrderItem {
	productId: string;
	quantity: number;
	price: number;
}

export type OrderStatus =
	| { kind: "pending" }
	| { kind: "confirmed"; confirmedAt: Date }
	| { kind: "shipped"; trackingNumber: string }
	| { kind: "delivered"; deliveredAt: Date }
	| { kind: "cancelled"; reason: string };

// ---------------------------------------------------------------------------
// Decorators
// ---------------------------------------------------------------------------

function memoize<This, Args extends unknown[], Return>(
	target: (this: This, ...args: Args) => Return,
	context: ClassMethodDecoratorContext<
		This,
		(this: This, ...args: Args) => Return
	>,
) {
	const cache = new WeakMap<object, Map<string, Return>>();
	return function (this: This, ...args: Args): Return {
		const ref = (this as unknown as object) ?? memoize;
		let bucket = cache.get(ref);
		if (!bucket) {
			bucket = new Map();
			cache.set(ref, bucket);
		}
		const key = JSON.stringify(args);
		if (bucket.has(key)) {
			return bucket.get(key) as Return;
		}
		const result = target.call(this, ...args);
		bucket.set(key, result);
		return result;
	};
}

function deprecated(message: string) {
	return function <This, Args extends unknown[], Return>(
		target: (this: This, ...args: Args) => Return,
		context: ClassMethodDecoratorContext,
	) {
		return function (this: This, ...args: Args): Return {
			console.warn(\`[deprecated] \${String(context.name)}: \${message}\`);
			return target.call(this, ...args);
		};
	};
}

// ---------------------------------------------------------------------------
// Service classes with mixed members
// ---------------------------------------------------------------------------

export abstract class Service<T extends { id: string }> {
	protected readonly storage: Map<string, T> = new Map();
	protected created: number = 0;
	protected lastAccess: Date = new Date();
	private fetchCount: number = 0;

	abstract validate(entity: T): boolean;
	abstract serialize(entity: T): string;

	@memoize
	get(id: string): T | undefined {
		this.lastAccess = new Date();
		return this.storage.get(id);
	}

	create(entity: T): T {
		if (!this.validate(entity)) {
			throw new Error(\`Invalid entity: \${this.serialize(entity)}\`);
		}
		this.storage.set(entity.id, entity);
		this.created += 1;
		return entity;
	}

	@deprecated("Use createMany instead")
	createBatch(entities: T[]): T[] {
		return entities.map((e: T) => this.create(e));
	}

	createMany(entities: ReadonlyArray<T>): T[] {
		return entities.map((e: T) => this.create(e));
	}

	delete(id: string): boolean {
		return this.storage.delete(id);
	}

	async exportAll(): Promise<string> {
		const lines: string[] = [];
		for (const entity of this.storage.values()) {
			lines.push(this.serialize(entity));
		}
		return lines.join("\\n");
	}
}

export class UserService extends Service<User> {
	private emailIndex: Map<Email, UserId> = new Map();

	validate(user: User): boolean {
		return user.name.length > 0 && user.email.includes("@");
	}

	serialize(user: User): string {
		return JSON.stringify({ id: user.id, name: user.name, email: user.email });
	}

	@memoize
	findByEmail(email: Email): User | undefined {
		const id = this.emailIndex.get(email);
		return id ? this.get(id as string) : undefined;
	}

	registerEmail(email: Email, id: UserId): void {
		this.emailIndex.set(email, id);
	}
}

// ---------------------------------------------------------------------------
// Generic utilities
// ---------------------------------------------------------------------------

export function pipe<A, B>(f: (a: A) => B): (a: A) => B;
export function pipe<A, B, C>(f: (a: A) => B, g: (b: B) => C): (a: A) => C;
export function pipe<A, B, C, D>(
	f: (a: A) => B,
	g: (b: B) => C,
	h: (c: C) => D,
): (a: A) => D;
export function pipe(...fns: Array<(x: unknown) => unknown>) {
	return (x: unknown) => fns.reduce((acc, fn) => fn(acc), x);
}

export function curry<A, B, C>(fn: (a: A, b: B) => C): (a: A) => (b: B) => C {
	return (a: A) => (b: B) => fn(a, b);
}

export async function* batches<T>(
	items: AsyncIterable<T>,
	size: number,
): AsyncGenerator<T[]> {
	let batch: T[] = [];
	for await (const item of items) {
		batch.push(item);
		if (batch.length >= size) {
			yield batch;
			batch = [];
		}
	}
	if (batch.length > 0) yield batch;
}

// ---------------------------------------------------------------------------
// Tagged templates and runtime use
// ---------------------------------------------------------------------------

const sql = (strings: TemplateStringsArray, ...values: unknown[]): string =>
	strings.reduce((acc, s, i) => acc + s + (values[i] ?? ""), "");

const userId: UserId = "u_123" as UserId;
const query = sql\`SELECT * FROM users WHERE id = \${userId}\`;

const service = new UserService();
const user: User | undefined = service.get(userId as string);
if (user) service.registerEmail(user.email, user.id);

export default UserService;

// Complex TypeScript exercising many features at once: conditional
// types, mapped types, recursive types, template literal types, decorators,
// abstract classes, generics with constraints, intersection / union types,
// and dense interface declarations. Sized to roughly mirror complex_js.
"use strict";

// ---------------------------------------------------------------------------
// Brand types and template literal types
// ---------------------------------------------------------------------------

export type Brand<T, B> = T & { readonly __brand: B };
export type UserId = Brand<string, "UserId">;
export type OrderId = Brand<string, "OrderId">;
export type Email = Brand<string, "Email"> & \`\${string}@\${string}\`;

export type Path<O, K extends keyof O = keyof O> = K extends string
	? O[K] extends Record<string, unknown>
		? \`\${K}.\${Path<O[K]>}\` | K
		: K
	: never;

// ---------------------------------------------------------------------------
// Conditional / mapped types
// ---------------------------------------------------------------------------

export type DeepReadonly<T> = T extends (...args: unknown[]) => unknown
	? T
	: T extends object
		? { readonly [K in keyof T]: DeepReadonly<T[K]> }
		: T;

export type DeepPartial<T> = T extends object
	? { [K in keyof T]?: DeepPartial<T[K]> }
	: T;

export type NonNullableKeys<T> = {
	[K in keyof T]: null extends T[K] ? never : K;
}[keyof T];

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

// ---------------------------------------------------------------------------
// Domain interfaces
// ---------------------------------------------------------------------------

export interface User {
	readonly id: UserId;
	name: string;
	email: Email;
	createdAt: Date;
	updatedAt: Date;
	preferences: UserPreferences;
	roles: readonly Role[];
}

export interface UserPreferences {
	theme: "light" | "dark" | "system";
	notifications: {
		email: boolean;
		push: boolean;
		digest: "daily" | "weekly" | "never";
	};
	language: string;
}

export interface Role {
	readonly id: string;
	name: string;
	permissions: ReadonlyArray<Permission>;
}

export interface Permission {
	resource: string;
	actions: ReadonlyArray<"read" | "write" | "delete">;
}

export interface Order {
	readonly id: OrderId;
	userId: UserId;
	items: OrderItem[];
	status: OrderStatus;
	total: number;
	createdAt: Date;
}

export interface OrderItem {
	productId: string;
	quantity: number;
	price: number;
}

export type OrderStatus =
	| { kind: "pending" }
	| { kind: "confirmed"; confirmedAt: Date }
	| { kind: "shipped"; trackingNumber: string }
	| { kind: "delivered"; deliveredAt: Date }
	| { kind: "cancelled"; reason: string };

// ---------------------------------------------------------------------------
// Decorators
// ---------------------------------------------------------------------------

function memoize<This, Args extends unknown[], Return>(
	target: (this: This, ...args: Args) => Return,
	context: ClassMethodDecoratorContext<
		This,
		(this: This, ...args: Args) => Return
	>,
) {
	const cache = new WeakMap<object, Map<string, Return>>();
	return function (this: This, ...args: Args): Return {
		const ref = (this as unknown as object) ?? memoize;
		let bucket = cache.get(ref);
		if (!bucket) {
			bucket = new Map();
			cache.set(ref, bucket);
		}
		const key = JSON.stringify(args);
		if (bucket.has(key)) {
			return bucket.get(key) as Return;
		}
		const result = target.call(this, ...args);
		bucket.set(key, result);
		return result;
	};
}

function deprecated(message: string) {
	return function <This, Args extends unknown[], Return>(
		target: (this: This, ...args: Args) => Return,
		context: ClassMethodDecoratorContext,
	) {
		return function (this: This, ...args: Args): Return {
			console.warn(\`[deprecated] \${String(context.name)}: \${message}\`);
			return target.call(this, ...args);
		};
	};
}

// ---------------------------------------------------------------------------
// Service classes with mixed members
// ---------------------------------------------------------------------------

export abstract class Service<T extends { id: string }> {
	protected readonly storage: Map<string, T> = new Map();
	protected created: number = 0;
	protected lastAccess: Date = new Date();
	private fetchCount: number = 0;

	abstract validate(entity: T): boolean;
	abstract serialize(entity: T): string;

	@memoize
	get(id: string): T | undefined {
		this.lastAccess = new Date();
		return this.storage.get(id);
	}

	create(entity: T): T {
		if (!this.validate(entity)) {
			throw new Error(\`Invalid entity: \${this.serialize(entity)}\`);
		}
		this.storage.set(entity.id, entity);
		this.created += 1;
		return entity;
	}

	@deprecated("Use createMany instead")
	createBatch(entities: T[]): T[] {
		return entities.map((e: T) => this.create(e));
	}

	createMany(entities: ReadonlyArray<T>): T[] {
		return entities.map((e: T) => this.create(e));
	}

	delete(id: string): boolean {
		return this.storage.delete(id);
	}

	async exportAll(): Promise<string> {
		const lines: string[] = [];
		for (const entity of this.storage.values()) {
			lines.push(this.serialize(entity));
		}
		return lines.join("\\n");
	}
}

export class UserService extends Service<User> {
	private emailIndex: Map<Email, UserId> = new Map();

	validate(user: User): boolean {
		return user.name.length > 0 && user.email.includes("@");
	}

	serialize(user: User): string {
		return JSON.stringify({ id: user.id, name: user.name, email: user.email });
	}

	@memoize
	findByEmail(email: Email): User | undefined {
		const id = this.emailIndex.get(email);
		return id ? this.get(id as string) : undefined;
	}

	registerEmail(email: Email, id: UserId): void {
		this.emailIndex.set(email, id);
	}
}

// ---------------------------------------------------------------------------
// Generic utilities
// ---------------------------------------------------------------------------

export function pipe<A, B>(f: (a: A) => B): (a: A) => B;
export function pipe<A, B, C>(f: (a: A) => B, g: (b: B) => C): (a: A) => C;
export function pipe<A, B, C, D>(
	f: (a: A) => B,
	g: (b: B) => C,
	h: (c: C) => D,
): (a: A) => D;
export function pipe(...fns: Array<(x: unknown) => unknown>) {
	return (x: unknown) => fns.reduce((acc, fn) => fn(acc), x);
}

export function curry<A, B, C>(fn: (a: A, b: B) => C): (a: A) => (b: B) => C {
	return (a: A) => (b: B) => fn(a, b);
}

export async function* batches<T>(
	items: AsyncIterable<T>,
	size: number,
): AsyncGenerator<T[]> {
	let batch: T[] = [];
	for await (const item of items) {
		batch.push(item);
		if (batch.length >= size) {
			yield batch;
			batch = [];
		}
	}
	if (batch.length > 0) yield batch;
}

// ---------------------------------------------------------------------------
// Tagged templates and runtime use
// ---------------------------------------------------------------------------

const sql = (strings: TemplateStringsArray, ...values: unknown[]): string =>
	strings.reduce((acc, s, i) => acc + s + (values[i] ?? ""), "");

const userId: UserId = "u_123" as UserId;
const query = sql\`SELECT * FROM users WHERE id = \${userId}\`;

const service = new UserService();
const user: User | undefined = service.get(userId as string);
if (user) service.registerEmail(user.email, user.id);

export default UserService;
`;
