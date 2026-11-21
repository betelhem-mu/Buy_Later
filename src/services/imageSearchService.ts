
export type ProductImageResult = {
    id: string;
    title: string;
    imageUrl: string;
    thumbnailUrl: string;
    creator: string | null;
    creatorUrl: string | null;
    license: string;
    licenseVersion: string | null;
    licenseUrl: string | null;
    sourceUrl: string;
};

type OpenverseImage = {
    id: string;
    title: string;
    url: string;
    thumbnail: string;
    creator: string | null;
    creator_url: string | null;
    license: string;
    license_version: string | null;
    license_url: string | null;
    foreign_landing_url: string;
    tags?: {
        name: string;
    }[];
};

type OpenverseResponse = {
    results: OpenverseImage[];
};

const ignoredWords = new Set([
    'the',
    'a',
    'an',
    'and',
    'or',
    'for',
    'with',
    'to',
    'of',
    'in',
    'on',
    'my',
    'new',
    'best',
    'buy',
    'product',
    'photo',
    'picture',
    'image',
]);

const getKeywords = (text: string): string[] => {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .trim()
        .split(/\s+/)
        .filter(
            (word) =>
                word.length > 1 && !ignoredWords.has(word)
        )
        .map((word) =>
            word.length > 4 && word.endsWith('s')
                ? word.slice(0, -1)
                : word
        );
};

const getRelevanceScore = (
    query: string,
    image: OpenverseImage
): number => {
    const queryKeywords = [...new Set(getKeywords(query))];

    if (queryKeywords.length === 0) {
        return 0;
    }

    const titleKeywords = new Set(getKeywords(image.title));

    const tagKeywords = new Set(
        (image.tags ?? []).flatMap((tag) =>
            getKeywords(tag.name)
        )
    );

    let score = 0;

    for (const word of queryKeywords) {
        if (titleKeywords.has(word)) {
            score += 2;
        } else if (tagKeywords.has(word)) {
            score += 1;
        }
    }

    const normalizedTitle = image.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();

    const normalizedQuery = query
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();

    if (normalizedTitle.includes(normalizedQuery)) {
        score += 2;
    }

    return score;
};

const filterAndSortImages = (
    query: string,
    images: OpenverseImage[]
): OpenverseImage[] => {
    const queryKeywords = [...new Set(getKeywords(query))];

    if (queryKeywords.length === 0) {
        return images;
    }

    return images
        .map((image) => ({
            image,
            score: getRelevanceScore(query, image),
        }))
        .filter((item) => item.score >= 1)
        .sort((a, b) => b.score - a.score)
        .map((item) => item.image);
};

const fetchOpenverseImages = async (
    url: string
): Promise<OpenverseResponse> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (response.ok) {
            return await response.json();
        }

        console.warn(
            `Openverse image service returned ${response.status}. Skipping suggestions.`
        );
        return { results: [] };
    } catch (error) {
        clearTimeout(timeoutId);
        console.warn(
            'Openverse image service timed out or was unreachable. Skipping suggestions.'
        );
        return { results: [] };
    }
};

export async function searchProductImages(
    query: string,
    page: number = 1
): Promise<ProductImageResult[]> {
    const trimmedQuery = query.trim();

    if (!trimmedQuery) {
        return [];
    }

    const params = new URLSearchParams({
        q: trimmedQuery,
        page: String(page),
        page_size: '12',
        license: 'cc0,pdm',
        mature: 'false',
        filter_dead: 'true',
    });

    const url =
        `https://api.openverse.org/v1/images/?${params.toString()}`;

    const data = await fetchOpenverseImages(url);

    const relevantImages = filterAndSortImages(
        trimmedQuery,
        data.results ?? []
    );

    return relevantImages.map((image) => ({
        id: image.id,
        title: image.title,
        imageUrl: image.url,
        thumbnailUrl: image.thumbnail,
        creator: image.creator,
        creatorUrl: image.creator_url,
        license: image.license,
        licenseVersion: image.license_version,
        licenseUrl: image.license_url,
        sourceUrl: image.foreign_landing_url,
    }));
}
