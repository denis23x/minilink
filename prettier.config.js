/** @type {import("prettier").Config} */
const config = {
  plugins: ["@ianvs/prettier-plugin-sort-imports"],
  importOrder: [
    "^react$",
    "^react/(.*)$",
    "^next$",
    "^next/(.*)$",
    "<THIRD_PARTY_MODULES>",
    "^~/types/(.*)$",
    "^~/lib/(.*)$",
    "^~/hooks/(.*)$",
    "^~/components/ui/(.*)$",
    "^~/components/(.*)$",
    "^~/styles/(.*)$",
    "^[./]",
  ],
  importOrderSeparation: false,
  importOrderSortSpecifiers: true,
};

module.exports = config;
