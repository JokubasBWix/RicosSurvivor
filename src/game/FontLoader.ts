import varogeSaroNoestUrl from '../assets/fonts/varoge-saro-noest-font/FtyVarogeSaroNoestNcv-2G0K.ttf';
import happyGiraffeUrl from '../assets/fonts/the-happy-giraffe-font/TheHappyGiraffeDemo-eJrB.ttf';
import mfILoveGlitterUrl from '../assets/fonts/mf-i-love-glitter-font/MfILoveGlitter-Kwwo.ttf';

export const FONT_DEFAULT = 'VarogeSaroNoest';
export const FONT_TANK = 'TheHappyGiraffe';
export const FONT_SNIPER = 'MfILoveGlitter';

const FONTS: { name: string; url: string }[] = [
  { name: FONT_DEFAULT, url: varogeSaroNoestUrl },
  { name: FONT_TANK, url: happyGiraffeUrl },
  { name: FONT_SNIPER, url: mfILoveGlitterUrl },
];

export async function loadFonts(): Promise<void> {
  const promises = FONTS.map(async ({ name, url }) => {
    const face = new FontFace(name, `url(${url})`);
    const loaded = await face.load();
    document.fonts.add(loaded);
  });
  await Promise.all(promises);
}
