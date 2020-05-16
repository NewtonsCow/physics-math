/**
 * @module physics-math
 * Copyright ©  by Bob Kerns. Licensed under MIT license
 */

/**
 * Representation and manipulation of physical units.
 *
 * These are based on SI, and in particular the
 * (Guide for the Use of the International System of Units (SI))[https://physics.nist.gov/cuu/pdf/sp811.pdf]
 * However, this does not try to be complete, and extends the set of base units somewhat
 * to aid clarity (for example, 'cycles/revolutions') while preserving semantics and standardized presentation.
 * Having units that map to SI '1' is not very helpful sometimes.
 */

import {Throw, Writeable} from "./utils";

/**
 * String literal parser for LaTeX literals (avoids the need for quoting backslash).
 */
const TeX = String.raw;

/**
 * Our enumerated primitive units.
 */
export enum UNIT {
    time = 'time',
    mass = 'mass',
    length = 'length',
    cycles = 'cycles', // Not SI base
    angle = 'angle',   // Not SI base
    solidAngle = 'solidAngle',   // Not SI base
    current = 'current', // Dunno why this is the SI base
    temperature = 'temperature',
    amount = 'amount', // Amount
    candela = 'candela' // An SI base unit for some reason
}

/**
 * A total order on units, for canonical display and key generation.
 */

const ORDER: {[K in UNIT]: number} = (i => {
    return {
        mass: i++,
        length: i++,
        angle: i++,
        solidAngle: i++,
        cycles: i++,
        amount: i++,
        current: i++,
        temperature: i++,
        time: i++,
        candela: i++
    };
})(0);

/**
 * Comparison predicate for primitive units to allow sorting them into a
 * canonical total order.
 *
 * @param a
 * @param b
 */
const orderUnits = (a: UNIT, b: UNIT) => {
    if (a === b) return 0;
    const ia = ORDER[a];
    const ib = ORDER[b];
    if (ia === ib) {
        // Shouldn't happen unless we're extending the set.
        return a < b ? -1 : 1;
    }
    return ia < ib ? -1 : 1;
};

/**
 * Our supported exponents. A finite list of exponents allows TypeScript to
 * automatically type exponents as numeric literal types.
 */
export type Exponent = -9|-8|-7|-6|-5|-4|-3|-2|-1|1|2|3|4|5|6|7|8|9;

/**
 * An object of primitive UNIT: Exponent pairs that uniquely describes each type.
 */
type UnitTerms = {
    [u in keyof typeof UNIT]?: Exponent;
};

/**
 * Turn the sttructured UnitTerms key into a string to do the lookup for unique types.
 * @param key
 */
const makeLookupKey = (key: UnitTerms) => {
    const units = Object.keys(key) as UNIT[];
    return units
        .filter(k => (key[k] || 0) !== 0)
        .sort(orderUnits)
        .map(k => `${PRIMITIVES[k]?.symbol || Throw(`Invalid primitive type name "${k} in type key.`)}^${key[k]}`)
        .join(' ');
}

export interface PrimitiveUnitAttributes {
    name: string;
    symbol: string;
    varName: string;
    absolute?: boolean;
    si_base?: boolean;
    [k: string]: any;
}

export interface UnitAttributes extends Partial<PrimitiveUnitAttributes> {
    tex?: string;
    scale?: number;
    offset?: number;
}

/**
 * The public interface to all units and alieses.
 */
export interface Unit<T extends UnitTerms = UnitTerms> {
    /**
     * Unique lookup key for this type.
     */
    readonly key: T;
    readonly id: string;

    readonly name: string;

    readonly symbol?: string;
    readonly varName?: string;
    readonly attributes: UnitAttributes;
    readonly tex: string;

    /**
     * Call to check units for addition/subtraction.
     * Throws an error if the units are not the same.
     * @param u
     */
    add(u: Unit<T>): this;

    /**
     * Produce new units multipying these units.
     * @param u
     */
    multiply(u: Unit): Unit;

    /**
     * Produce new units dividing by these units.
     * @param u
     */
    divide(u: Unit): Unit;
}

/**
 * Base class for all units (and aliases).
 */
abstract class BaseUnit<T extends UnitTerms> implements Unit<T> {
    readonly key: T;
    readonly symbol?: string;
    readonly attributes: UnitAttributes;
    private id_?: string;
    // Our cached or supplied LaTeX string.
    private tex_?: string;

    protected constructor(key: T, attributes: UnitAttributes) {
        this.key = key;
        this.attributes = attributes;
        const {tex} = attributes;
        if (tex) {
            this.tex_ = tex;
        }
    }

    get tex(): string {
        const makeTex = (key: UnitTerms) => {
            const units = Object.keys(key) as UNIT[];
            const numUnits = units
                .filter(k => (key[k] || 0) > 0)
                .sort(orderUnits);
            const num = numUnits
                .map(k => TeX`${PRIMITIVES[k].tex}${(key[k] || 0) > 1 ? TeX`^(${key[k]})` : TeX``}`)
                .join(TeX`\dot`);
            const denomUnits = units
                .filter(k => (key[k] || 0) < 0)
                .sort(orderUnits);
            const denom = denomUnits
                .map(k => TeX`${PRIMITIVES[k].tex}${(key[k] || 0) < -1 ? TeX`^{${-(key[k] || 0)}}` : TeX``}`)
                .join(TeX`\dot`);
            return denomUnits.length === 0
                ? num
                : TeX`\frac{${num || 1}}{${denom}}`;
        };
        return this.tex_ || (
            this.tex_ = (
                this.symbol
                    ? TeX`\text{${this.symbol}}`
                    : makeTex(this.key)
            )
        );
    }

    get id() {
        return this.id_ || (this.id_ = makeLookupKey(this.key));
    }
    add(u: Unit<T>): this {
        const t = this;
        if (u !== t) {
            throw new Error(`Incompatible types: ${t.name} and ${u.name}`);
        }
        return this;
    }

    abstract readonly name: string;

    private combine<X extends UnitTerms>(u: Unit<X>, dir = 1 | -1): Unit {
        const nkey: Writeable<UnitTerms> = {};
        const add = (k: UNIT) => {
            const n = (this.key[k] || 0) + (u.key[k] || 0) * dir;
            if (n != 0) {
                nkey[k] = n as Exponent;
            }
        }
        const scan = (u: Unit) => (Object.keys(u.key) as UNIT[]).forEach(add);
        scan(this);
        scan(u);
        return defineUnit(nkey);
    }

    multiply<X extends UnitTerms>(u: Unit<X>): Unit {
        return this.combine(u, 1);
    }

    divide<X extends UnitTerms>(u: Unit<X>): Unit {
        return this.combine(u, -1);
    }
}

/**
 * Our primitive (non-decomposable) units.
 */
class PrimitiveUnit<U extends UNIT> extends BaseUnit<{[K in U]: 1}> {
    readonly symbol: string;
    readonly name: string;
    readonly varName?: string;
    readonly unit: UNIT;
    constructor(u: U, name: string, symbol: string, varName?: string, attributes: UnitAttributes = {}) {
        super({[u]: 1} as {[K in U]: 1}, {name, symbol, varName, ...attributes});
        this.name = name;
        this.symbol = symbol;
        this.varName = varName;
        this.unit = u;
    }
}

/**
 * Type of our PRIMITIVES map. This provides one key/value entry for each primitive,
 * indexed by the UNIT enum.
 */
type PrimitiveMap = {
    [k in keyof typeof UNIT]: PrimitiveUnit<(typeof UNIT)[k]>
};

/**
 * A map from unit key's string representation to the Unit instance.
 */
const UNITS: {
    [k: string]: Unit;
} = {};

/**
 * A map from name to the Unit representing that unit.
 */
const NAMED_UNITS: {[key: string]: Unit } = { };
export const getUnit = (name: string) =>
    NAMED_UNITS[name]
    || Throw(`No unit named ${{name}}`);

/**
 * A map from primitive name to its Unit instance.
 */
const PRIMITIVES: Readonly<PrimitiveMap> = (() => {
    const val: PrimitiveMap = {} as PrimitiveMap;
    const defPrimitive = (u: UNIT, name: string, symbol: string, varName?: string,
                          attributes: UnitAttributes = {}) =>
    {
        const primitive = new PrimitiveUnit(u, name, symbol, varName, attributes);
        (val as any)[u] = primitive;
        NAMED_UNITS[u] = primitive;
        NAMED_UNITS[name] = primitive;
        NAMED_UNITS[symbol] = primitive;
        return primitive;
    }
    defPrimitive(UNIT.time, 'second','s', 't', {si_base: true});
    defPrimitive(UNIT.mass, 'kilogram', 'kg', 'm',
        {si_base: true, scale: 1000});
    defPrimitive(UNIT.length, 'meter', 'm', 'l', {si_base: true});
    defPrimitive(UNIT.amount, 'mole', 'mol', 'n', {si_base: true});
    defPrimitive(UNIT.cycles, 'cycle', 'cycle', 'c');
    defPrimitive(UNIT.angle, 'radian', 'rad', '𝜃',
        {tex: TeX`\theta`});
    defPrimitive(UNIT.solidAngle, 'steridian', 'sr', undefined);
    defPrimitive(UNIT.current, 'ampere', 'A', 'A', {si_base: true});
    defPrimitive(UNIT.temperature, 'kelvin', 'K', 'T',
        {absolute: true, si_base: true});
    defPrimitive(UNIT.candela, 'candela', 'cd', 'c', {si_base: true})
    return val as PrimitiveMap;
})();

// Enter each primitive into the UNITS table by ID.
Object.values(PRIMITIVES)
    .forEach(u => UNITS[u.id] = u);

/**
 * Derived units build on the primitive units through multiplication (integration)
 * and division (differentiation).
 */
class DerivedUnit<T extends UnitTerms> extends BaseUnit<T> {
    readonly name: string;
    readonly symbol?: string;
    readonly varName?: string;
    constructor(key: T, attributes: UnitAttributes = {}) {
        super(key, attributes);
        const {name, symbol, varName} = attributes;
        if (symbol) {
            this.symbol = symbol;
        }
        if (varName) {
            this.varName = varName;
        }
        if (name) {
            this.name = name;
        } else {
            const units = Object.keys(key) as UNIT[];
            const numUnits = units
                .filter(k => (key[k] || 0) > 0)
                .sort(orderUnits);
            const num = numUnits
                .map(k => `${PRIMITIVES[k].symbol}${(key[k] || 0) > 1 ? `^${key[k]}` : ''}`)
                .join(`·`);
            const denomUnits = units
                .filter(k => (key[k] || 0) < 0)
                .sort(orderUnits);
            const denom = denomUnits
                .map(k => `${PRIMITIVES[k].symbol}${(key[k] || 0) < -1 ? `^${-(key[k] || 0)}` : ''}`)
                .join(`·`);
            this.name = denomUnits.length === 0
                ? num
                : denomUnits.length === 1
                    ? `${num || 1}/${denom}`
                    : `${num || 1}/(${denom})`;
        }
    }
}

/**
 * Define a derived type.
 *
 * The numbers in the keys are exponents for primitive types. They are taken as type literals,
 *
 * This ensures, for example, that the types of U_velocity and U_acceleration are distinct.
 * ```javascript
 * const U_velocity     = defineUnit({distance: 1, time: -1});
 * const U_acceleration = defineUnit({distance: 1, time: -2});
 * ```
 * Results in types of:
 * ```
 * type U_velocity     = Unit<{distance: 1, time: -1}>
 * type U_acceleration = Unit<{distance: 1, time: -2}>
 * ```
 *
 * @param key The key defining the type composition
 * @param attributes Additional attributes describing the type.
 * @param names Additional names to use for this type, e.g. newton.
 */
export const defineUnit =
    <T extends UnitTerms>(key: T, attributes: UnitAttributes = {}, ...names: string[]): Unit<T> => {
        const lookupKey = makeLookupKey(key);
        const addName = (u: Unit<T>) => (n?: string) => {
            if (n) {
                const enamed = NAMED_UNITS[n];
                if (enamed) {
                    if (enamed !== u) {
                            throw new Error(`Conflict of name ${n}: ${enamed.name} => ${u.name}`);
                    }
                } else {
                    NAMED_UNITS[n] = u;
                }
            }
            return u;
        };
        const {name, symbol} = attributes;
        const addSpecials = (u: Unit<T>) => {
            const an = addName(u);
            an(name || u.name);
            an(symbol);
        };
        const addNames = (u: Unit<T>) => {
            names.forEach(addName(u));
            addSpecials(u);
        }
        const existing = UNITS[lookupKey] as Unit<T>;
        if (existing) {
            addNames(existing);
            // Once set, attributes cannot be modified, but new ones can be added.
            Object.assign(existing.attributes, {...attributes, ...existing.attributes});
            return existing;
        }
        const newUnit = new DerivedUnit(key, attributes);
        UNITS[lookupKey] = newUnit;
        addNames(newUnit);
    return newUnit;
};

// noinspection JSUnusedGlobalSymbols
export const U_mass: Unit<{mass: 1}> = PRIMITIVES.mass;
// noinspection JSUnusedGlobalSymbols
export const U_time = PRIMITIVES.time;
// noinspection JSUnusedGlobalSymbols
export const U_length: Unit<{length: 1}> = PRIMITIVES.length;
// noinspection JSUnusedGlobalSymbols
export const U_angle = PRIMITIVES.angle;
// noinspection JSUnusedGlobalSymbols
export const U_amount = PRIMITIVES.amount;
// noinspection JSUnusedGlobalSymbols
export const U_cycles = PRIMITIVES.cycles;
// noinspection JSUnusedGlobalSymbols
export const U_current = PRIMITIVES.current;
// noinspection JSUnusedGlobalSymbols
export const U_temperature = PRIMITIVES.temperature;
// noinspection JSUnusedGlobalSymbols
export const U_candela = PRIMITIVES.candela;

export * from './unit-defs';

/**
 * A namespace for unit test access
 */
export namespace TEST {
    export const PRIMITIVES_ = PRIMITIVES;
    export const NAMED_UNITS_ = NAMED_UNITS;
    /**
     * Delete a unit created by a test case.
     * @param u
     */
    export const deleteUnit = (u: Unit | null | undefined) => {
        if (u) {
            const delFrom = (table: { [k: string]: Unit }) =>
                Object.keys(table)
                    .forEach(k => table[k] === u && delete table[k]);
            delFrom(NAMED_UNITS_);
            delFrom(UNITS);
        }
    };
}
