import { useState, useEffect } from 'react';
import { productsAPI, Product } from '@/services/api';

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [category, setCategory] = useState<string>('');

  useEffect(() => {
    loadProducts();
  }, [category]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const data = await productsAPI.getProducts(category || undefined);
      setProducts(data);
    } catch (err: any) {
      setError('Ошибка загрузки товаров');
    } finally {
      setLoading(false);
    }
  };

  const categories = ['Все', 'Солнцезащитные', 'Для чтения', 'Спортивные', 'Компьютерные', 'Детские'];

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Каталог товаров</h1>

      {/* Фильтр по категориям */}
      <div className="mb-6 flex flex-wrap gap-2">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat === 'Все' ? '' : cat)}
            className={`px-4 py-2 rounded-lg ${
              (cat === 'Все' && !category) || cat === category
                ? 'bg-primary-600 text-white'
                : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Список товаров */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map((product) => (
          <div key={product.id} className="card hover:shadow-lg transition-shadow">
            <div className="aspect-video bg-gray-200 rounded-lg mb-4 flex items-center justify-center">
              <span className="text-6xl">🥽</span>
            </div>
            <h3 className="text-xl font-bold mb-2">{product.name}</h3>
            <p className="text-gray-600 mb-3">{product.description}</p>
            <div className="flex justify-between items-center">
              <span className="text-2xl font-bold text-primary-600">
                {product.price.toFixed(2)} ₽
              </span>
              <span
                className={`badge ${
                  product.in_stock ? 'badge-success' : 'badge-error'
                }`}
              >
                {product.in_stock ? 'В наличии' : 'Нет в наличии'}
              </span>
            </div>
            <div className="mt-3">
              <span className="text-sm text-gray-500">{product.category}</span>
            </div>
          </div>
        ))}
      </div>

      {products.length === 0 && !loading && (
        <div className="text-center py-12 text-gray-500">
          Товары не найдены
        </div>
      )}
    </div>
  );
}

