import React, { useState, useEffect } from 'react';

interface Candlestick {
  openTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  closeTime: number;
}

interface TradingPair {
  symbol: string;
  candlesticks: Candlestick[];
  chandelierOfReferenceHigh: number;
  lastChandelier97High: number | null;
}

const App = () => {
  const [timeFrame, setTimeFrame] = useState('1h');
  const [tradingPairs, setTradingPairs] = useState<TradingPair[]>([]);
  const [filteredPairs, setFilteredPairs] = useState<TradingPair[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchCandlestickData = async () => {
      setLoading(true);
      try {
        const exchangeResponse = await fetch(
          `https://api.binance.com/api/v3/exchangeInfo`
        );
        const exchangeData = await exchangeResponse.json();

        const symbols = exchangeData.symbols.filter(
          (symbol: any) => symbol.quoteAsset === 'USDT'
        );

        const promises = symbols.map((symbol: any) =>
          fetch(
            `https://api.binance.com/api/v3/klines?symbol=${symbol.symbol}&interval=${timeFrame}&limit=10`
          ).then((response) => response.json())
        );

        const responses = await Promise.all(promises);

        const pairs: TradingPair[] = responses.map(
          (candlestickData: any, index: number) => {
            const candlesticks: Candlestick[] = candlestickData.map((candlestick: any) => ({
              openTime: candlestick[0],
              open: parseFloat(candlestick[1]),
              high: parseFloat(candlestick[2]),
              low: parseFloat(candlestick[3]),
              close: parseFloat(candlestick[4]),
              volume: parseFloat(candlestick[5]),
              closeTime: candlestick[6],
            }));

            const chandelierOfReference = candlesticks.reduce((max, current) => {
              return current.high > max.high ? current : max;
            }, candlesticks[0]);

            const filteredCandlesticks = candlesticks.filter((candlestick) => {
              return candlestick.low >= chandelierOfReference.low / 2;
            });

            const lastChandelier97 = filteredCandlesticks.find((candlestick) => {
              return candlestick.high >= chandelierOfReference.high * 0.97;
            });

            return {
              symbol: symbols[index].baseAsset + '-USDT',
              candlesticks,
              chandelierOfReferenceHigh: chandelierOfReference.high,
              lastChandelier97High: lastChandelier97 ? lastChandelier97.high : null,
            };
          }
        );

        setTradingPairs(pairs);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCandlestickData();
  }, [timeFrame]);

  useEffect(() => {
    const filterTradingPairs = () => {
      // Filter out pairs where chandelierOfReferenceHigh is equal to lastChandelier97High
      const filtered = tradingPairs.filter((pair) => 
        pair.lastChandelier97High !== pair.chandelierOfReferenceHigh
      );
      setFilteredPairs(filtered);
    };

    filterTradingPairs();
  }, [tradingPairs]);

  const handleTimeFrameChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setTimeFrame(event.target.value);
  };

  return (
    <div className="max-w-7xl mx-auto p-4">
      <h1 className="text-3xl font-bold mb-4">USDT Trading Pairs</h1>
      <select
        className="block w-full pl-10 py-3 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
        value={timeFrame}
        onChange={handleTimeFrameChange}
      >
        <option value="1m">1 minute</option>
        <option value="1h">1 hour</option>
        <option value="1d">1 day</option>
      </select>

      {loading ? (
        <p className="text-gray-600 mt-4">Loading...</p>
      ) : (
        <div className="mt-4">
          <table className="table-auto w-full border-collapse border">
            <thead>
              <tr>
                <th className="border p-2">Symbol</th>
                <th className="border p-2">Reference High</th>
                <th className="border p-2">97% High</th>
              </tr>
            </thead>
            <tbody>
              {filteredPairs.map((pair, index) => (
                <tr key={index} className="border">
                  <td className="border p-2">{pair.symbol}</td>
                  <td className="border p-2">{pair.chandelierOfReferenceHigh}</td>
                  <td className="border p-2">
                    {pair.lastChandelier97High ?? 'N/A'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredPairs.length > 0 ? (
            <p className="mt-4 text-gray-800 font-semibold">
              Displaying results: {filteredPairs.length} pairs (10x10 grid)
            </p>
          ) : (
            <p className="mt-4 text-gray-800">No matching pairs found.</p>
          )}
        </div>
      )}
    </div>
  );
};

export default App;
