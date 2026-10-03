import { cylinderTankQuestion, openCuboidQuestion, pyramidQuestion } from "@latveria/shared";

export function isLegacyRoofQuestion(prompt: string) {
  return (
    /atap/i.test(prompt) &&
    /limas/i.test(prompt) &&
    /genteng/i.test(prompt) &&
    /\$\$\s*\\begin\{tikzpicture\}/.test(prompt)
  );
}

export function isLegacyOpenCuboidQuestion(prompt: string) {
  return (
    /Nipon/i.test(prompt) &&
    /isolator/i.test(prompt) &&
    /\\begin\{tikzpicture\}\[scale=/.test(prompt)
  );
}

export function isLegacyCylinderTankQuestion(prompt: string) {
  return (
    /Dumai/i.test(prompt) && /154/.test(prompt) && /\\begin\{tikzpicture\}\[scale=/.test(prompt)
  );
}

export function geometryQuestionData(prompt: string) {
  if (/atap/i.test(prompt) && /limas/i.test(prompt) && /genteng/i.test(prompt))
    return pyramidQuestion;
  if (/Nipon/i.test(prompt) && /isolator/i.test(prompt)) return openCuboidQuestion;
  if (/Dumai/i.test(prompt) && /154/.test(prompt) && /tabung|tangki/i.test(prompt))
    return cylinderTankQuestion;
  return null;
}
