import { Slider as SliderPrimitive } from "@base-ui/react/slider"

function Slider(props: SliderPrimitive.Root.Props) {
  const { value, defaultValue, min = 0, className } = props
  const values = Array.isArray(value)
    ? value
    : typeof value === "number"
      ? [value]
      : Array.isArray(defaultValue)
        ? defaultValue
        : typeof defaultValue === "number"
          ? [defaultValue]
          : [min]

  return (
    <SliderPrimitive.Root {...props} className={className} min={min} thumbAlignment="edge">
      <SliderPrimitive.Control>
        <SliderPrimitive.Track>
          <SliderPrimitive.Indicator />
        </SliderPrimitive.Track>
        {values.map((_, index) => (
          <SliderPrimitive.Thumb key={index} index={index} />
        ))}
      </SliderPrimitive.Control>
    </SliderPrimitive.Root>
  )
}

export { Slider }
