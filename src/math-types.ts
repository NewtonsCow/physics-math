import {quat, vec4} from "gl-matrix";
import {Constructor} from "./utils";

type Constructor3N<R> = Constructor<R, [number, number, number]>;
type Constructor4N<R> = Constructor<R, [number, number, number, number]>;

export enum TYPE {
    SCALAR,
    VECTOR,
    ROTATION,
    POINT = 9,
    ORIENTATION = 10
}

interface DataType<T extends TYPE> {
    readonly type: T;
}

export type DataTypeOf<D> = D extends number ? TYPE.SCALAR : D extends DataType<infer T> ? T : never;

export const datatype = (d: any): TYPE => typeof d === 'number' ? TYPE.SCALAR : d.type;
/**
 * Marker interface for types which represent relative info, such as vectors or rotations
 */
export interface Relative<A> {}

/**
 * Marker interface for types which represent info intrinsic to a particular object,
 * such as position in space (point) or orientation
 */
export interface Intrinsic<R> {}

/**
 * Marker for all non-scalar values
 */
/**
 * Marker for all non-scalar values
 */
export interface NonScalarValue extends DataType<TYPE.VECTOR | TYPE.POINT | TYPE.ROTATION | TYPE.ORIENTATION> {
    0: number;
    1: number;
    2: number;
    3: number;
    type: TYPE.POINT | TYPE.VECTOR | TYPE.ORIENTATION | TYPE.ROTATION;
}

export type RelativeOf<T> = T extends Point ? Vector : T extends Orientation ? Rotation : T;
export type IntrinsicOf<T> = T extends Vector ? Point : T extends Rotation ? Orientation : T;

/**
 * Our primitive datatypes
 */
export type ScalarValue = number;
export type BaseValueRelative = ScalarValue | Vector | Rotation;
export type BaseValueIntrinsic = Point | Orientation;
// noinspection JSUnusedGlobalSymbols
export type BaseValueNonScalar = Point | Vector | Orientation | Rotation;
// noinspection JSUnusedGlobalSymbols
export type BaseValueRelativeNonScalar = Vector | Rotation;
export type BaseValue = BaseValueRelative | BaseValueIntrinsic;

abstract class ArrayBase extends Float64Array implements NonScalarValue {
    protected constructor() {
        super(4);
    }
    0: number;
    1: number;
    2: number;
    3: number;
    abstract get type(): TYPE.POINT | TYPE.VECTOR | TYPE.ORIENTATION | TYPE.ROTATION;
    assign(): this;
    assign(other: ArrayBase): this;
    assign(a: number, b: number, c: number): this;
    assign(a: number, b: number, c: number, d: number): this;
    assign(a: number|ArrayBase = 0, b: number = 0, c: number = 0, d: number = this[3]): this {
        if (typeof a === 'number') {
            this[0] = a;
            this[1] = b;
            this[2] = c;
            this[3] = d;
        } else {
            this[0] = a[0];
            this[1] = a[1];
            this[2] = a[2];
            this[3] = a[3];
        }
        return this;
    }
}


abstract class Vectorish<W extends 0 | 1 = 0 | 1> extends ArrayBase implements DataType<TYPE.VECTOR|TYPE.POINT> {
    0: number;
    1: number;
    2: number;
    3: W;
    protected constructor(x = 0, y = 0, z = 0, w: W) {
        super();
        this[0] = x;
        this[1] = y;
        this[2] = z;
        this[3] = w;
    }
    abstract get type(): TYPE.POINT | TYPE.VECTOR;

    // noinspection JSUnusedGlobalSymbols
    get vec4() {
        return this as unknown as vec4;
    }

    get x() {
        return this[0];
    }

    set x(v) {
        this[0] = v;
    }

    get y() {
        return this[1];
    }

    set y(v) {
        this[1] = v;
    }

    get z() {
        return this[2];
    }

    set z(v) {
        this[2] = v;
    }

    get w() {
        return this[3];
    }

    add(v: Vector): this {
        const c = this.constructor as typeof Vector;
        return new c(this[0] + v[0], this[1] + v[1], this[2] + v[2]) as unknown as this;
    }

    // noinspection JSUnusedGlobalSymbols
    addf(v: Vector): this {
        this[0] += v[0];
        this[1] += v[1];
        this[2] += v[2];
        return this;
    }

    sub(v: Vector): this {
        const c = this.constructor as typeof Vector;
        return new c(this[0] - v[0], this[1] - v[1], this[2] - v[2]) as unknown as this;
    }

    // noinspection JSUnusedGlobalSymbols
    subf(v: Vector): this {
        this[0] -= v[0];
        this[1] -= v[1];
        this[2] -= v[2];
        return this;
    }

    // noinspection JSUnusedGlobalSymbols
    mult(n: number): this {
        const c = this.constructor as typeof Vector;
        return new c(this[0] * n, this[1] * n, this[2] * n) as unknown as this;
    }

    // noinspection JSUnusedGlobalSymbols
    multf(n: number): this {
        this[0] -= n;
        this[1] -= n;
        this[2] -= n;
        return this;
    }

    // noinspection JSUnusedGlobalSymbols
    clone(): this {
        const c = this.constructor as Constructor3N<Vectorish>;
        return new c(this[0], this[1], this[2]) as this;
    }
}

export class Point extends Vectorish<1> implements Intrinsic<Vector>, DataType<TYPE.POINT> {
    get type(): TYPE.POINT { return TYPE.POINT; }

    constructor(x = 0, y = 0, z = 0) {
        super(x, y, z, 1);
    }

    static coerce(p: Point | vec4) {
        if (isPoint(p)) {
            return p;
        } else {
            return new Point(p[0], p[1], p[2])
        }
    }
}

export class Vector extends Vectorish<0> implements Relative<Point>, DataType<TYPE.VECTOR> {
    get type(): TYPE.VECTOR { return TYPE.VECTOR; }

    constructor(x = 0, y = 0, z = 0) {
        super(x, y, z, 0);
    }

    static coerce(v: Vector | vec4) {
        if (isVector(v)) {
            return v;
        } else {
            return new Vector(v[0], v[1], v[2])
        }
    }
}

/**
 * Rotation or Orientationm represented as a versor, aka a unit quaternion.
 */
abstract class Rotationish extends ArrayBase implements DataType<TYPE.ROTATION|TYPE.ORIENTATION> {
    protected constructor(i = 0, j = 0, k = 0, w = 1) {
        super();
        this[0] = i;
        this[1] = j;
        this[2] = k;
        this[3] = w;
    }
    abstract get type(): TYPE.ROTATION | TYPE.ORIENTATION;

    get i() {
        return this[0];
    }

    set i(v) {
        this[0] = v;
    }

    get j() {
        return this[1];
    }

    set j(v) {
        this[1] = v;
    }

    get k() {
        return this[2];
    }

    set k(v) {
        this[2] = v;
    }

    get w() {
        return this[3];
    }

    set w(v) {
        this[3] = v;
    }

    protected get quat() {
        return this as unknown as quat;
    }

    /**
     * Addition here is the group operator on the rotation group, i.e. addition of spherical (great-circle)
     * on the versor surface. This corresponds to multiplication of the underlying quaternions.
     * @param a
     */
    add(a: Rotationish): this {
        return quat.multiply(
            this.create() as unknown as quat,
            this as unknown as quat,
            a as unknown as quat
        ) as unknown as this;
    }

    // noinspection JSUnusedGlobalSymbols
    addf(a: Rotationish): this {
        return quat.multiply(
            this as unknown as quat,
            this as unknown as quat,
            a as unknown as quat
        ) as unknown as this;
    }

    sub(a: Rotationish): this {
        return quat.multiply(
            this.create() as unknown as quat,
            this as unknown as quat,
            quat.conjugate(quat.create(),
                a as unknown as quat)
        ) as unknown as this;
    }

    // noinspection JSUnusedGlobalSymbols
    subf(a: Rotationish): this {
        return quat.multiply(
            this as unknown as quat,
            this as unknown as quat,
            quat.conjugate(quat.create(),
                a as unknown as quat)
        ) as unknown as this;
    }

    /**
     * Because multiplication of quaternions is equal to addition of sphereical vectors on the
     * 3D unit sphere, multiplication of those vectors by a real is the same as exponentiation of
     * their quaternions by a real.
     * @param n
     */
    // noinspection JSUnusedGlobalSymbols
    mult(n: number): this {
        return quat.pow(
            this.create() as unknown as quat,
            this as unknown as quat,
            n
        ) as unknown as this;
    }

    /**
     * Because multiplication of quaternions is equal to addition of sphereical vectors on the
     * 3D unit sphere, multiplication of those vectors by a real is the same as exponentiation of
     * their quaternions by a real.
     * @param n
     */
    // noinspection JSUnusedGlobalSymbols
    multf(n: number): this {
        return quat.pow(
            this as unknown as quat,
            this as unknown as quat,
            n
        ) as unknown as this;
    }

    // noinspection JSUnusedGlobalSymbols
    clone(): this {
        const c = this.constructor as Constructor4N<Rotationish>;
        return new c(this[0], this[1], this[2], this[3]) as this;
    }

    create(): this {
        const c = this.constructor as Constructor<Rotationish> ;
        return new c() as this;
    }

    /**
     * Normalizes in-place.
     */
    normalize() {
        quat.normalize(this.quat, this.quat);
        return this;
    }

    // noinspection JSUnusedGlobalSymbols
    conjugate() {
        const c = this.constructor as Constructor4N<Rotationish>;
        return new c(-this[0], -this[1], -this[2], this[3]);
    }

    // noinspection JSUnusedGlobalSymbols
    rotate<T extends Rotationish>(b: T) {
        const ax = this[0];
        const ay = this[1];
        const az = this[2];
        const aw = this[3];
        const bx = b[0];
        const by = b[1];
        const bz = b[2];

        const cx = aw * bx + ay * bz - az * by;
        const cy = aw * by + az * bx - ax * bz;
        const cz = aw * bz + ax * by - ay * bx;
        const cw = ax * bx - ay * by - az * bz;

        const dx = cx * aw + cw * -ax + cy * -az - cz * -ay;
        const dy = cy * aw + cw * -ay + cz * -ax - cx * -az;
        const dz = cz * aw + cw * -az + cx * -ay - cy * -ax;
        const dw = cw * aw - cx * -ax - cy * -ay - cz * -az;

        const w = dw === 0 ? 1 : dw;
        let c = b.constructor as Constructor3N<T>;
        return new c(dx/2, dy/w, dz/w);
    }

    static fromEulerX<T extends Rotationish>(cls: Constructor4N<T>, x: number, y: number, z: number) {
        const sx = Math.sin(x);
        const cx = Math.cos(x);
        const sy = Math.sin(y);
        const cy = Math.cos(y);
        const sz = Math.sin(z);
        const cz = Math.cos(z);

        const i = sx * cy * cz - cx * sy * sz;
        const j = cx * sy * cz + sx * cy * sz;
        const k = cx * cy * sz - sx * sy * cz;
        const w = cx * cy * cz + sx * sy * sz;
        return new cls(i, j, k, w);
    }
}

export type Positional = Point | Vector;
export type Rotational = Orientation | Rotation;

export class Orientation extends Rotationish implements Intrinsic<Rotation>, DataType<TYPE.ORIENTATION> {
    constructor(i = 0, j = 0, k = 0, w = 1) {
        super(i, j, k, w);
    }
    get type(): TYPE.ORIENTATION { return TYPE.ORIENTATION; }

    static coerce(q: Rotationish | quat): Orientation {
        if (isOrientation(q)) {
            return q;
        } else if (isRotation(q)) {
            return new Orientation(q.i, q.j, q.k)
        } else {
            return new Orientation(q[0], q[1], q[2], q[3])
        }
    }
    static fromEuler(x: number, y: number, z: number) {
        return Rotationish.fromEulerX(Orientation, x, y, z);
    }
}

export class Rotation extends Rotationish implements Relative<Orientation> {
    constructor(i = 0, j = 0, k = 0, w = 1) {
        super(i, j, k, w);
    }
    get type(): TYPE.ROTATION { return TYPE.ROTATION; }

    static coerce(q: Rotationish | quat): Rotation {
        if (isRotation(q)) {
            return q;
        } else if (isOrientation(q)) {
            return new Rotation(q.i, q.j, q.k)
        } else {
            return new Rotation(q[0], q[1], q[2], q[3])
        }
    }
    static fromEuler(x: number, y: number, z: number) {
        return Rotationish.fromEulerX(Rotation, x, y, z);
    }
}

// noinspection JSUnusedGlobalSymbols
export const isBaseValue = (v: any): v is BaseValue => typeof v === 'number' || v instanceof Vectorish || v instanceof Rotationish;
export const isPositional = (v: any): v is Positional => v instanceof Vectorish;
export const isPoint = (v: any): v is Point => v instanceof Point;
export const isVector = (v: any): v is Vector => v instanceof Vector;
export const isRotational = (v: any): v is Rotational => v instanceof Rotationish;
export const isOrientation = (v: any): v is Orientation => v instanceof Orientation;
export const isRotation = (v: any): v is Rotation => v instanceof Rotation;
// noinspection JSUnusedGlobalSymbols
export const isIntrinsic = (v: any): v is BaseValueIntrinsic => v instanceof Point || v instanceof Orientation;
// noinspection JSUnusedGlobalSymbols
export const isScalarValue = (v: any): v is ScalarValue => typeof v === 'number';
// noinspection JSUnusedGlobalSymbols
export const isNonScalarValue = (v: any): v is NonScalarValue => isPositional(v) || isRotational(v);

export const vector = (x: number = 0, y: number = 0, z: number = 0) => new Vector(x, y, z);
export const point = (x: number = 0, y: number = 0, z: number = 0) => new Point(x, y, z);
// noinspection JSUnusedGlobalSymbols
export const rotation = (i = 0, j = 0, k = 0, w = 1) => new Rotation(i, j, k, w);
// noinspection JSUnusedGlobalSymbols
export const orientation = (i = 0, j = 0, k = 0, w = 1) => new Orientation(i, j, k, w);
