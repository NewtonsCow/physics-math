/*
 * @module physics-math
 * Copyright 2020 by Bob Kerns. Licensed under MIT license.
 *
 * Github: https://github.com/BobKerns/physics-math
 */

/**
 * Test the common PFunction functionality.
 */

import {PFunction} from "../pfunction";
import {GFunction} from "../general-fns";
import {TYPE} from "../math-types";
import {ScalarConstant} from "../scalar";
import {U} from "../unit-defs";

describe('PFunction', () => {
    test('create',
        () => expect(new GFunction(() => 7)).toBeInstanceOf(PFunction));
    test('invoke',
        () => expect(new GFunction((t: number) => 7 * t).f(6)).toBe(42));
    test('type GFunction',
        () => expect(new GFunction((t: number) => 7 * t).returnType).toBe(TYPE.SCALAR));
    test('type Scalar',
        () => expect(new ScalarConstant(7, U.time).returnType).toBe(TYPE.SCALAR));
 });
