export const stripDiacritics = (input: string) => {
  try {
    return input.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  } catch {
    return input;
  }
};

export const normalizeNameKey = (raw: string) =>
  stripDiacritics(raw || "")
    .trim()
    .toLowerCase();
