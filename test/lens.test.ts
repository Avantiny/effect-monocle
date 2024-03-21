import { Option, pipe } from "effect"
import { Lens, Optional } from "effect-monocle"
import { expect, test } from "vitest"

const obj = {
  type: "obj1" as const,
  prop: 1,
  another: {
    hello: "world"
  },
  super: {
    nested: {
      data: {
        structure: 69
      }
    }
  },
  values: [1, 2],
  valuesNonEmpty: [1, 2] as [number, ...Array<number>]
}

type Obj = typeof obj
type Super = Obj["super"]

const objLens = Lens.id<Obj>()
const superLens = Lens.id<Super>()

test.each(
  [
    {
      propLens: Lens.prop(objLens, "prop"),
      helloLens: Lens.prop(objLens, "another", "hello"),
      dataLens: Lens.prop(objLens, "super", "nested", "data"),
      structureLens: Lens.prop(objLens, "super", "nested", "data", "structure")
    },
    {
      propLens: pipe(objLens, Lens.prop("prop")),
      helloLens: pipe(objLens, Lens.prop("another", "hello")),
      dataLens: pipe(objLens, Lens.prop("super", "nested", "data")),
      structureLens: pipe(objLens, Lens.prop("super", "nested", "data", "structure"))
    }
  ] as const
)("prop", ({ dataLens, helloLens, propLens, structureLens }) => {
  expect(propLens.set(obj, 2)).toStrictEqual({ ...obj, prop: 2 })
  expect(pipe(obj, propLens.set(2))).toStrictEqual({ ...obj, prop: 2 })

  expect(helloLens.set(obj, "patrik")).toEqual({ ...obj, another: { hello: "patrik" } })
  expect(pipe(obj, helloLens.set("patrik"))).toEqual({ ...obj, another: { hello: "patrik" } })

  expect(dataLens.set(obj, { structure: 1 })).toEqual({ ...obj, super: { nested: { data: { structure: 1 } } } })
  expect(pipe(obj, dataLens.set({ structure: 1 }))).toEqual({ ...obj, super: { nested: { data: { structure: 1 } } } })

  expect(structureLens.set(obj, 1)).toEqual({ ...obj, super: { nested: { data: { structure: 1 } } } })
  expect(pipe(obj, structureLens.set(1))).toEqual({ ...obj, super: { nested: { data: { structure: 1 } } } })
})

test.each(
  [
    Lens.compose(
      Lens.prop(objLens, "super"),
      Lens.prop(superLens, "nested", "data", "structure")
    ),
    pipe(
      Lens.prop(objLens, "super"),
      Lens.compose(Lens.prop(superLens, "nested", "data", "structure"))
    )
  ] as const
)("compose", (lens) => {
  expect(lens.set(obj, -1)).toEqual({
    ...obj,
    super: { nested: { data: { structure: -1 } } }
  })
  expect(pipe(obj, lens.set(-1))).toEqual({ ...obj, super: { nested: { data: { structure: -1 } } } })
})

test("append", () => {
  const valuesLens = Lens.prop(objLens, "values")
  const appendValue = Lens.append(valuesLens)

  expect(Lens.append(valuesLens, obj, 3)).toEqual({ ...obj, values: [1, 2, 3] })

  expect(appendValue(obj, 3)).toEqual({ ...obj, values: [1, 2, 3] })
  expect(pipe(obj, appendValue(3))).toEqual({ ...obj, values: [1, 2, 3] })
})

test("appendAll", () => {
  const valuesLens = Lens.prop(objLens, "values")
  const appendValue = Lens.appendAll(valuesLens)

  expect(Lens.appendAll(valuesLens, obj, [3, 4])).toEqual({ ...obj, values: [1, 2, 3, 4] })

  expect(appendValue(obj, [3, 4])).toEqual({ ...obj, values: [1, 2, 3, 4] })
  expect(pipe(obj, appendValue([3, 4]))).toEqual({ ...obj, values: [1, 2, 3, 4] })
})

test("headNonEmpty", () => {
  const lens = Lens.headNonEmpty(Lens.prop(objLens, "valuesNonEmpty"))

  expect(lens.get(obj)).toEqual(1)
  expect(lens.set(obj, 3)).toEqual({ ...obj, valuesNonEmpty: [3, 2] })

  const lens2 = Lens.prop(objLens, "valuesNonEmpty").pipe((_) => Lens.headNonEmpty(_)) // TODO weird type inference

  expect(lens2.get(obj)).toEqual(1)
  expect(lens2.set(obj, 3)).toEqual({ ...obj, valuesNonEmpty: [3, 2] })
})

const obj2 = {
  type: "obj2" as const,
  another: {
    property: "hello"
  }
}

type Obj2 = typeof obj2

test("extract", () => {
  const myObj = {
    value: obj as Obj | Obj2
  }

  const myObj2 = {
    value: obj2 as Obj | Obj2
  }

  const optional = pipe(
    Lens.id<typeof myObj>(),
    Lens.prop("value"),
    Lens.extract("type", "obj1"),
    Optional.prop("valuesNonEmpty")
  )

  expect(optional.getOption(myObj)).toEqual(Option.some(obj.values))
  expect(optional.getOption(myObj2)).toEqual(Option.none())

  expect(optional.set(myObj, [1])).toStrictEqual({ value: { ...obj, valuesNonEmpty: [1] } })
  expect(optional.set(myObj2, [1])).toStrictEqual(myObj2)
})
