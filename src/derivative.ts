import {BaseValue, Point, Rotation, TYPE, Vector} from "./math-types";
import {IndefiniteIntegral, PCalculus, PFunction} from "./pfunction";
import {IPCompiled, IPCompileResult, IPFunction} from "./base";
import {AnalyticIntegral} from "./integral";

const bounds = <R extends BaseValue>(f: IPCompiled<R>, t: number): [R, R, number] => {
    const timestep = f.pfunction.timestep;
    const l = f(t - timestep / 2);
    const u = f(t + timestep / 2);
    return [l, u, timestep];
};

/**
 * Calculate the derivative of a function numerically, by examining nearby values on either side of
 * the point. Points that are technically no-differentiable (such as where piecewise-define segments
 * meet) are computed as an average.
 * @param f
 */
const makeDerivative = (f: IPCompiled<number>) => (t: number) => {
    const [l, u, timestep] = bounds<number>(f, t);
    return (u - l) / timestep;
}
export class NumericDerivative extends PCalculus<number> {
    private readonly from: IPFunction<number>;
    constructor(f: IPFunction<number>) {
        super({});
        this.from = f;
        this.setName_(`deriv[${f.name}]`);
    }

    differentiate(): IPFunction<number> {
        return new NumericDerivative(this);
    }

    integrate(): IndefiniteIntegral<number> {
        return new AnalyticIntegral(this.from);
    }

    get returnType(): TYPE.SCALAR {
        return TYPE.SCALAR;
    }

    protected compileFn(): IPCompileResult<number> {
        return makeDerivative(this.from.f);
    }
}

const makeDerivativeV = (f: IPCompiled<Point|Vector>) => (t: number) => {
    const [l, u, timestep] = bounds<Point|Vector>(f, t);
    const dx = (u.x - l.x) / timestep;
    const dy = (u.y - l.y) / timestep;
    const dz = (u.z - l.z) / timestep;
    return new Vector(dx, dy, dz);
}
// noinspection JSUnusedGlobalSymbols
export class VectorDerivative extends PCalculus<Vector> {
    private readonly from: IPFunction<Vector>;
    constructor(f: IPFunction<Vector>) {
        super({});
        this.from = f;
        this.setName_(`deriv[${f.name}]`);
    }

    differentiate(): IPFunction<Vector> {
        return new VectorDerivative(this);
    }

    integrate(): IndefiniteIntegral<Vector> {
        throw new Error(`Integrating vectors not yet supported.`)
        // return new AnalyticIntegral(this.from);
    }

    get returnType(): TYPE.VECTOR {
        return TYPE.VECTOR;
    }

    protected compileFn(): IPCompileResult<Vector> {
        return makeDerivativeV(this.from.f);
    }
}

const makeDerivativeQ = (f: IPCompiled<Rotation>) => (t: number) => {
    const [l, u, timestep] = bounds<Rotation>(f, t);
    const di = (u.i - l.i) / timestep;
    const dj = (u.j - l.j) / timestep;
    const dk = (u.k - l.k) / timestep;
    const dw = (u.w - l.w) / timestep;
    return new Rotation(di, dj, dk, dw).normalize();
}
// noinspection JSUnusedGlobalSymbols
export class QuaternionDerivative extends PFunction<Rotation> {
    private readonly from: PFunction<Rotation>;
    constructor(f: PFunction<Rotation>) {
        super({});
        this.from = f;
        this.setName_(`deriv[${f.name}]`);
    }

    differentiate(): PFunction<Rotation> {
        return new QuaternionDerivative(this);
    }

    integrate() {
        return this.from;
    }

    get returnType(): TYPE.ROTATION {
        return TYPE.ROTATION;
    }

    protected compileFn(): IPCompileResult<Rotation> {
        return makeDerivativeQ(this.from.f);
    }
}
