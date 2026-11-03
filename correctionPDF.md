# Corrections pour l'affichage de l'arabe dans PDFKit

## 1. Installer les dépendances

```bash
npm install arabic-reshaper bidi-js
```

---

## 2. Remplacer les imports

Remplacer :

```ts
import arabicReshaper from "arabic-reshaper";
```

par :

```ts
import arabicReshaper from "arabic-reshaper";
import bidiFactory from "bidi-js";

const bidi = bidiFactory();
```

---

## 3. Corriger la fonction ar()

Supprimer :

```ts
function ar(text: string): string {
  try {
    const reshaped = arabicReshaper.convertArabic(text);
    return reshaped.split("").reverse().join("");
  } catch {
    return text.split("").reverse().join("");
  }
}
```

Ajouter :

```ts
function ar(text: string | number | null | undefined): string {
  if (!text) return "";

  try {
    const reshaped = arabicReshaper.convertArabic(String(text));
    const levels = bidi.getEmbeddingLevels(reshaped, "rtl");
    return bidi.getReorderedString(reshaped, levels);
  } catch {
    return String(text);
  }
}
```

---

## 4. Corriger les titres RTL

Utiliser :

```ts
doc.text(ar(title), 45, doc.y, {
  width: usableWidth,
  align: "right",
});
```

---

## 5. Corriger les textes centrés

Utiliser :

```ts
doc.text(ar(text), 45, doc.y, {
  width: usableWidth,
  align: "center",
});
```

---

## 6. Corriger les listes et conditions

Remplacer les calculs manuels avec `widthOfString()` par :

```ts
doc.text(ar(line), 45, doc.y, {
  width: usableWidth,
  align: "right",
});
```

---

## 7. Vérifier les polices

Placer dans :

```txt
public/fonts/
```

Les fichiers :

```txt
NotoSansArabic-Regular.ttf
NotoSansArabic-Bold.ttf
```

ou :

```txt
Amiri-Regular.ttf
Amiri-Bold.ttf
```

---

## 8. Résultat attendu

- Texte arabe lisible
- Support RTL correct
- Chiffres et dates correctement affichés
- Emails non inversés
- PDF professionnel
