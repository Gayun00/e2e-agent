import React from 'react';

export default function Header() {
  return (
    <header className="header" data-testid="header">
      <nav>
        <a href="/" data-testid="nav-home">홈</a>
        <a href="/products" data-testid="nav-products">상품</a>
        <a href="/cart" data-testid="nav-cart">장바구니</a>
        <a href="/login" data-testid="nav-login">로그인</a>
      </nav>
    </header>
  );
}
