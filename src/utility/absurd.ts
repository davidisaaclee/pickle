export function absurd(value: never): any {
  throw new Error(`Unexpected case: ${value}`);
}

export default absurd;
