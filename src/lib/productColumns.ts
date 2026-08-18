// Columnas de `products` que calcula la base y la aplicación no debe escribir.
//
// `search_text` es una columna generada: Postgres la mantiene sola a partir del
// nombre, las descripciones y la clasificación. Intentar guardarla —aunque sea
// con el mismo valor que acaba de leerse— falla con "column can only be updated
// to DEFAULT", y eso rompe cualquier pantalla que lea la fila con select * y la
// devuelva entera.
//
// La lista está aquí y no repartida por las pantallas para que agregar otra
// columna generada sea un solo cambio.
export const COLUMNAS_GENERADAS = ["search_text"] as const;

/** Copia la fila sin las columnas que gestiona la base. */
export function sinColumnasGeneradas<T extends Record<string, unknown>>(row: T): T {
  const out = { ...row };
  for (const col of COLUMNAS_GENERADAS) delete out[col];
  return out;
}
