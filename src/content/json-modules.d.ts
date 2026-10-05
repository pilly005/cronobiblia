// Allows `import data from "../content/packs/*.json"` in TypeScript.
// (Equivale a "resolveJsonModule": true para estos paquetes de contenido.)
declare module "*.json" {
  const value: any;
  export default value;
}
