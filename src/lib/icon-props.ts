const base = {
  join: "round" as const,
  stroke: "2" as const,
  radius: "2" as const,
};

/** minimal props (no size/ariaHidden). call sites add whatevers needed */
export const centralIconProps = {
  ...base,
  fill: "filled" as const,
};

/** filled style, size 20, ariaHidden */
export const centralIconPropsFilled20 = {
  ...base,
  fill: "filled" as const,
  size: 20,
  ariaHidden: true as const,
};

/** filled style, size 24, ariaHidden */
export const centralIconPropsFilled24 = {
  ...base,
  fill: "filled" as const,
  size: 24,
  ariaHidden: true as const,
};

/** outlined style, size 20, ariaHidden */
export const centralIconPropsOutlined20 = {
  ...base,
  fill: "outlined" as const,
  size: 20,
  ariaHidden: true as const,
};

/** outlined style, size 24, ariaHidden */
export const centralIconPropsOutlined24 = {
  ...base,
  fill: "outlined" as const,
  size: 24,
  ariaHidden: true as const,
};

/** Outlined style, size 28, ariaHidden. */
export const centralIconPropsOutlined28 = {
  ...base,
  fill: "outlined" as const,
  size: 28,
  ariaHidden: true as const,
};
