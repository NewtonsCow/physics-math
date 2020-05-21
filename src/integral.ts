/*
 * @module physics-math
 * Copyright 2020 by Bob Kerns. Licensed under MIT license.
 *
 * Github: https://github.com/BobKerns/physics-math
 */

/**
 * Classes to support integration
 */

import {BaseValueRelative, TYPE} from "./math-types";
import {PCalculus, PFunction, TIMESTEP} from "./pfunction";
import {DefiniteIntegral, IndefiniteIntegral, IPCompiled, IPCompileResult, IPFunction, IPFunctionCalculus, PFunctionDefaults} from "./base";
import {sub} from "./arith";
import {Unit, Divide, Multiply} from "./units";
import {Units} from './unit-defs';

const makeDefiniteIntegral = <
    T extends BaseValueRelative,
    U extends Unit,
    D extends Unit,
    I extends Unit = Multiply<U, Units.time>
    > (f: IndefiniteIntegral<T, U, D, I>) =>
    (t0: number) => new DefiniteIntegralImpl<T, U, D, I>(f, t0).f;

export class DefiniteIntegralImpl<
    R extends BaseValueRelative,
    U extends Unit,
    D extends Unit,
    I extends Unit
    >
    extends PCalculus<R, U, D, I>
    implements DefiniteIntegral<R, U, D, I> {
    readonly from: IndefiniteIntegral<R, U, D, I>;
    readonly t0: number;

    get returnType() {
        return this.from.returnType;
    }

    constructor(f: IndefiniteIntegral<R, U, D>, t0: number) {
        super(makeDefiniteIntegral(f)(t0));
        this.from = f;
        this.t0 = t0;
    }

    differentiate(): IPFunctionCalculus<R, D, 1, Divide<D, Units.time>, U> {
        return this.from.integrand;
    }

    integrate(): IndefiniteIntegral<R, I, U, Multiply<I, Units.time>> {
        return this.from.integral() as unknown as IndefiniteIntegral<R, I, U, Multiply<I, Units.time>>;
    }

    protected compileFn(): IPCompileResult<R> {
        return makeDefiniteIntegral(this.from)(this.t0);
    }
}

abstract class IndefiniteIntegralBase<
    R extends BaseValueRelative,
    U extends Unit,
    D extends Unit,
    I extends Unit
    >
    extends PFunction<R, U, 2>
    implements IndefiniteIntegral<R, U, D, I> {

    integrand: IPFunctionCalculus<R, D, 1, Divide<D, Units.time>, U>;

    protected constructor(
        integrand: IPFunctionCalculus<R, D, 1, Divide<D, Units.time>, U>,
        unit: U,
        options = PFunctionDefaults[2]
    )
    {
        super({...options, unit});
        this.integrand = integrand;
    }

    get returnType(): TYPE {
        return this.integrand.returnType;
    }

    protected abstract compileFn(): IPCompileResult<R, 2>;

    abstract integrate(): IndefiniteIntegral<R, I, U>;

    derivative(): IPFunctionCalculus<R, D, 1, Divide<D, Units.time>, U> {
        return this.integrand;
    }

    integral(): IndefiniteIntegral<R, I, U, Multiply<I, Units.time>> {
        return this.integrate() as unknown as IndefiniteIntegral<R, I, U, Multiply<I, Units.time>>;
    }
}

// noinspection JSUnusedGlobalSymbols
export class AnalyticIntegral<
    R extends BaseValueRelative,
    U extends Unit,
    D extends Unit,
    I extends Unit
    >
    extends IndefiniteIntegralBase<R, U, D, I>
{
    readonly expression: IPFunctionCalculus<R, U, 1, D, I>;
    constructor(integrand: IPFunctionCalculus<R, D, 1, Divide<D, Units.time>, U>,
                integral: IPFunctionCalculus<R, U, 1, D, I>,
                options = PFunctionDefaults[2]) {
        super(integrand, integral.unit, options);
        this.expression = integral;
    }

    protected compileFn(): IPCompileResult<R, 2> {
        const efn = this.expression.compile();
        return (t0: number, t: number): R => sub<R>(efn(t), efn(t0));
    }

    integrate(): IndefiniteIntegral<R, I, U> {
        return this.expression.integral();
    }
}
export const integrate = (f: IPCompiled<number>) => (t0:number, t: number) => {
    const timestep = TIMESTEP;
    let a = 0;
    let v = f(t0);
    for (let i = 0; i < t; i += timestep) {
        const nv = f(i + timestep);
        a += ((v + nv) * timestep) / 2;
        v = nv;
    }
    return a;
};

export class NumericIntegral<
    U extends Unit,
    D extends Unit,
    I extends Unit
    > extends IndefiniteIntegralBase<number, U, D, I>
{
    get returnType(): TYPE {
        return TYPE.SCALAR;
    }
    readonly integrand: IPFunction<number, D, 1, Divide<D, Units.time>, U>;
    constructor(
        integrand: IPFunction<number, D, 1, Divide<D, Units.time>, U>,
        unit: U,
        options = PFunctionDefaults[2] )
    {
        super(integrand, unit, options);
        this.integrand = integrand;
    }

    protected compileFn(): IPCompileResult<number, 2> {
        return integrate(this.integrand.compile());
    }

    differentiate(): IPFunction<number, D, 1, Divide<D, Units.time>, U> {
        return this.integrand;
    }

    integrate(): IndefiniteIntegral<number, I, U> {
        throw new Error('Double integral not supported yet.');
    }
}
