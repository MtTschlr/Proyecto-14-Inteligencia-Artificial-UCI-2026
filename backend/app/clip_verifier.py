import torch
from PIL import Image

CLIP_ARCH = "ViT-B-32"
CLIP_WEIGHTS = "laion2b_s34b_b79k"

# Las claves de PROJECT_FRUITS son las frutas del modelo; el resto, cosas que el modelo puede confundir con fruta.
PROJECT_FRUITS = {
    "banana": ["banana", "green banana", "ripe banana", "overripe banana with brown spots"],
    "mango": ["mango", "green mango", "ripe mango", "rotten mango"],
    "naranja": ["orange fruit", "green orange fruit", "ripe orange fruit", "moldy orange fruit"],
    "tomate": ["tomato", "red tomato", "green tomato", "rotten tomato"],
}
OTHER_THINGS = {
    "manzana": ["apple", "red apple", "green apple"],
    "limón": ["lemon", "lime"],
    "mandarina": ["tangerine", "mandarin orange"],
    "durazno": ["peach"],
    "pera": ["pear"],
    "papaya": ["papaya"],
    "pomelo": ["grapefruit"],
    "frutilla": ["strawberry"],
    "calabaza": ["pumpkin", "squash"],
    "morrón": ["bell pepper"],
    "papa": ["potato"],
    "cebolla": ["onion"],
    "techo": ["ceiling"],
    "pared": ["wall"],
    "lámpara": ["lamp"],
    "pelota": ["ball", "basketball"],
    "mano": ["hand"],
    "cara": ["face", "person"],
    "sombrero": ["hat"],
    "mesa": ["table"],
    "caja": ["box", "cardboard box"],
}
# CLIP no distingue bien estas frutas parecidas: su puntaje se suma al de la fruta del proyecto.
CLIP_RELATIVES = {"naranja": {"mandarina", "pomelo"}, "mango": {"papaya", "durazno"}}
CLIP_TEMPLATES = [
    "a photo of a {}.",
    "a close-up photo of a {}.",
    "a cropped photo of the {}.",
    "a low resolution photo of a {}.",
]
FEMININE_THINGS = {
    "manzana", "mandarina", "pera", "papaya", "frutilla", "calabaza", "papa", "cebolla",
    "pared", "lámpara", "pelota", "mano", "cara", "mesa", "caja",
}


def with_article(name: str) -> str:
    return f"{'una' if name in FEMININE_THINGS else 'un'} {name}"


class ClipVerifier:
    def __init__(self):
        import open_clip

        self.model, _, self.preprocess = open_clip.create_model_and_transforms(CLIP_ARCH, pretrained=CLIP_WEIGHTS)
        self.model.eval()
        tokenizer = open_clip.get_tokenizer(CLIP_ARCH)
        self.names = list(PROJECT_FRUITS) + list(OTHER_THINGS)
        groups = {**PROJECT_FRUITS, **OTHER_THINGS}
        embeddings = []
        with torch.no_grad():
            for name in self.names:
                texts = [t.format(p) for p in groups[name] for t in CLIP_TEMPLATES]
                emb = self.model.encode_text(tokenizer(texts))
                emb = emb / emb.norm(dim=-1, keepdim=True)
                emb = emb.mean(dim=0)
                embeddings.append(emb / emb.norm())
        self.text = torch.stack(embeddings)

    def classify(self, crops: list[Image.Image]) -> list[dict[str, float]]:
        with torch.no_grad():
            batch = torch.stack([self.preprocess(c) for c in crops])
            img = self.model.encode_image(batch)
            img = img / img.norm(dim=-1, keepdim=True)
            probs = (100.0 * img @ self.text.T).softmax(dim=-1)
        return [dict(zip(self.names, p.tolist())) for p in probs]


def clip_check(fruit: str, scores: dict[str, float], margin: float, swap: float):
    family = {f: scores[f] + sum(scores[r] for r in CLIP_RELATIVES.get(f, ())) for f in PROJECT_FRUITS}
    related = {r for rs in CLIP_RELATIVES.values() for r in rs}
    others = {k: v for k, v in scores.items() if k not in PROJECT_FRUITS and k not in related}
    best_fruit = max(family, key=family.get)
    best_other = max(others, key=others.get)
    info = {
        "winner": best_fruit if family[best_fruit] >= others[best_other] else best_other,
        "score": round(max(family[best_fruit], others[best_other]), 3),
        "fruit_score": round(family[fruit], 3),
    }
    if others[best_other] > family[best_fruit] and others[best_other] - family[fruit] > margin:
        return "reject", info
    if best_fruit != fruit and family[best_fruit] > swap:
        return "swap", info
    return "ok", info
