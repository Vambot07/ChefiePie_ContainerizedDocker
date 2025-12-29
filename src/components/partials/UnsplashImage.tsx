import { Image, View, ActivityIndicator, Text } from 'react-native';
import { useState, useEffect } from 'react';

interface UnsplashImageProps {
    query: string;
    alt?: string;
    style?: any;
}

const UNSPLASH_ACCESS_KEY = "BCT7BV4zUrqsRfYy9O5ALTxXSA7YVfEBAtqiJPVBBn0";

// Cache to store fetched image URLs by query (prevents re-fetching on re-renders)
const imageCache = new Map<string, string>();

/**
 * Custom component to fetch and display Unsplash images using the official API
 * Extracts search query from URLs like: https://source.unsplash.com/800x600/?query-terms
 * Uses caching to prevent re-fetching the same query on component re-renders
 */
const UnsplashImage = ({ query, alt = 'Recipe Image', style }: UnsplashImageProps) => {
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        const fetchImage = async () => {
            if (!UNSPLASH_ACCESS_KEY) {
                console.error('❌ Unsplash API key not configured');
                setError(true);
                setLoading(false);
                return;
            }

            // Check cache first
            if (imageCache.has(query)) {
                const cachedUrl = imageCache.get(query)!;
                console.log('📦 Using cached image for query:', query);
                setImageUrl(cachedUrl);
                setLoading(false);
                return;
            }

            try {
                console.log('🔍 Fetching Unsplash image for query:', query);

                const response = await fetch(
                    `https://api.unsplash.com/photos/random?query=${encodeURIComponent(query)}&orientation=landscape&client_id=${UNSPLASH_ACCESS_KEY}`,
                    {
                        headers: {
                            'Accept-Version': 'v1',
                        },
                    }
                );

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }

                const data = await response.json();

                // Use the regular size image (better quality than thumb, but not too large)
                const imageUrl = data.urls?.regular || data.urls?.small;

                console.log('✅ Got Unsplash image:', imageUrl);

                // Cache the image URL
                imageCache.set(query, imageUrl);

                setImageUrl(imageUrl);
                setLoading(false);
            } catch (err: any) {
                console.error('❌ Unsplash fetch error:', err.message);
                setError(true);
                setLoading(false);
            }
        };

        fetchImage();
    }, [query]);

    if (loading) {
        return (
            <View style={[style, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#F3F4F6' }]}>
                <ActivityIndicator size="small" color="#FF9966" />
            </View>
        );
    }

    if (error || !imageUrl) {
        return (
            <View style={[style, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#F3F4F6' }]}>
                <Text style={{ color: '#9CA3AF', fontSize: 12 }}>🍽️</Text>
            </View>
        );
    }

    return (
        <View style={{ marginTop: 12, marginBottom: 18 }}>
            <Image
                source={{ uri: imageUrl }}
                style={style}
                resizeMode="cover"
                onError={() => {
                    console.error('❌ Image failed to load:', imageUrl);
                    setError(true);
                }}
            />
            <Text style={{
                fontSize: 10,
                color: '#9CA3AF',
                fontStyle: 'italic',
                marginTop: 6,
                marginBottom: 8,
                textAlign: 'center'
            }}>
                ℹ️ Image may not exactly match the recipe
            </Text>
        </View>
    );
};

export default UnsplashImage;
