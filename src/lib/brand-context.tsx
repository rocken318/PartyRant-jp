'use client';

import { createContext, useContext } from 'react';
import { BRANDS, DEFAULT_BRAND_ID, type Brand } from '@/lib/brands';

const BrandContext = createContext<Brand>(BRANDS[DEFAULT_BRAND_ID]);

export function BrandProvider({ brand, children }: { brand: Brand; children: React.ReactNode }) {
  return <BrandContext.Provider value={brand}>{children}</BrandContext.Provider>;
}

/** クライアントコンポーネントで現在のブランドを取得。 */
export function useBrand(): Brand {
  return useContext(BrandContext);
}
