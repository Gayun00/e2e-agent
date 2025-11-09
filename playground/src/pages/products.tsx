import React from 'react';

interface Product {
  id: number;
  name: string;
  price: number;
  description: string;
}

const products: Product[] = [
  { id: 1, name: '노트북', price: 1500000, description: '고성능 노트북' },
  { id: 2, name: '마우스', price: 50000, description: '무선 마우스' },
  { id: 3, name: '키보드', price: 120000, description: '기계식 키보드' },
];

export default function ProductsPage() {
  return (
    <div className="products-container">
      <h1>상품 목록</h1>
      <div className="product-list" data-testid="product-list">
        {products.map((product) => (
          <div key={product.id} className="product-card" data-testid={`product-${product.id}`}>
            <h2>{product.name}</h2>
            <p className="price">{product.price.toLocaleString()}원</p>
            <p className="description">{product.description}</p>
            <button data-testid={`add-to-cart-${product.id}`}>
              장바구니 담기
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
