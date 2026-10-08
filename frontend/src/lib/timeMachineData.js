// Historical stock data & simulation engine for the Compounding Time Machine

export const TIME_MACHINE_STOCKS = [
  {
    id: 'wipro',
    name: 'Wipro Limited',
    ticker: 'WIPRO',
    listingYear: 1980,
    cagr: 35.8, // Long-term historical CAGR including splits and bonus shares
    sector: 'IT & Software',
    color: '#38bdf8',
    avatar: '💻',
    founder: 'Azim Premji',
    fact: 'The legendary Amalner story: ₹10,000 invested in 1980 with bonuses & splits turned into ₹1,400+ Crores!',
    description: 'From vegetable oils in 1945 to a multi-billion dollar global software exporter.'
  },
  {
    id: 'reliance',
    name: 'Reliance Industries',
    ticker: 'RELIANCE',
    listingYear: 1983,
    cagr: 21.2,
    sector: 'Conglomerate / Tech & Telecom',
    color: '#0ea5e9',
    avatar: '⚡',
    founder: 'Dhirubhai Ambani',
    fact: 'Pioneered India\'s retail equity culture with legendary AGMs held in sports stadiums.',
    description: 'Polyester yarn to refining, then revolutionizing India with Jio 4G/5G and retail.'
  },
  {
    id: 'titan',
    name: 'Titan Company',
    ticker: 'TITAN',
    listingYear: 1987,
    cagr: 28.6,
    sector: 'Consumer / Jewelry & Watches',
    color: '#ec4899',
    avatar: '💎',
    founder: 'Tata Group',
    fact: 'Rakesh Jhunjhunwala\'s favorite stock: bought at ₹3–₹4, turned into thousands of crores with Tanishq.',
    description: 'Disrupted the Indian jewelry and watch market with trusted Tata branding.'
  },
  {
    id: 'asianpaints',
    name: 'Asian Paints',
    ticker: 'ASIANPAINT',
    listingYear: 1983,
    cagr: 22.8,
    sector: 'Consumer & Paints',
    color: '#f59e0b',
    avatar: '🎨',
    founder: 'Champaklal Choksey',
    fact: 'India\'s fastest mainframe computer in 1970 was bought by Asian Paints to map supply chain demand.',
    description: 'Dominant 50%+ market share in decorative paints, steady compounding for 4 decades.'
  },
  {
    id: 'itc',
    name: 'ITC Limited',
    ticker: 'ITC',
    listingYear: 1983,
    cagr: 17.6,
    sector: 'FMCG & Diversified',
    color: '#10b981',
    avatar: '🛒',
    founder: 'Established 1910',
    fact: 'India\'s undisputed dividend powerhouse and creator of household staples like Aashirvaad & Sunfeast.',
    description: 'Monopoly cash-flows fueling multi-sector FMCG, paper, hotels, and agricultural reach.'
  },
  {
    id: 'infosys',
    name: 'Infosys',
    ticker: 'INFY',
    listingYear: 1993,
    cagr: 27.4,
    sector: 'IT & Consulting',
    color: '#6366f1',
    avatar: '🌐',
    founder: 'N. R. Narayana Murthy',
    fact: 'First Indian company to list on NASDAQ in 1999, creating thousands of employee crorepatis via ESOPs.',
    description: 'Symbol of India\'s IT revolution, recognized globally for ethical governance.'
  },
  {
    id: 'hdfcbank',
    name: 'HDFC Bank',
    ticker: 'HDFCBANK',
    listingYear: 1995,
    cagr: 24.3,
    sector: 'Private Banking',
    color: '#2563eb',
    avatar: '🏦',
    founder: 'Aditya Puri',
    fact: 'Never saw gross NPA cross 1.5% through multiple economic cycles for over 25 consecutive years.',
    description: 'India\'s largest private bank and trusted digital credit powerhouse.'
  },
  {
    id: 'lt',
    name: 'Larsen & Toubro',
    ticker: 'LT',
    listingYear: 1983,
    cagr: 18.9,
    sector: 'Infrastructure & Engineering',
    color: '#8b5cf6',
    avatar: '🏗️',
    founder: 'Henning Holck-Larsen',
    fact: 'Built bridges, metro systems, launchpads for ISRO Chandrayaan, and critical nuclear reactors.',
    description: 'The physical backbone of modern India\'s infrastructure and engineering marvels.'
  },
  {
    id: 'tcs',
    name: 'Tata Consultancy Services',
    ticker: 'TCS',
    listingYear: 2004,
    cagr: 19.6,
    sector: 'IT & Global Services',
    color: '#14b8a6',
    avatar: '💼',
    founder: 'F. C. Kohli (Tata Group)',
    fact: 'India\'s largest private employer and highest corporate taxpayer with industry-leading 25%+ margins.',
    description: 'The gold standard of software delivery operating across 55 countries.'
  },
  {
    id: 'nifty',
    name: 'Nifty 50 / Sensex Index',
    ticker: 'BENCHMARK',
    listingYear: 1983,
    cagr: 15.1,
    sector: 'India Benchmark 50',
    color: '#D4AF37',
    avatar: '🇮🇳',
    founder: 'BSE / NSE',
    fact: 'Sensex started at base 100 in 1979 and crossed 82,000+ in 2026! Over 800x growth for passive India investors.',
    description: 'The baseline index holding the top 50 bluechip companies driving India\'s GDP.'
  }
];

export const HISTORICAL_ERAS = [
  {
    year: 1983,
    title: 'Kapil Dev 1983 World Cup',
    tagline: 'Underdogs conquer Lord\'s Cricket Ground',
    icon: '🏏',
    marketTrivia: 'Sensex was under 250 points. A single gold coin was ₹1,800. SIP wasn\'t even a word yet!'
  },
  {
    year: 1991,
    title: 'LPG Economic Reforms',
    tagline: 'Manmohan Singh opens Indian economy',
    icon: '🚀',
    marketTrivia: 'India abolishes license raj. Private enterprise, foreign capital, and NSE were born.'
  },
  {
    year: 1995,
    title: 'Internet & Cellular Dawn',
    tagline: 'VSNL launches public internet in India',
    icon: '🌐',
    marketTrivia: 'First mobile call made in India by Jyoti Basu. HDFC Bank opened its first branch.'
  },
  {
    year: 2000,
    title: 'Millennium & Dot-Com Mania',
    tagline: 'Y2K bug solved by Indian IT engineers',
    icon: '💻',
    marketTrivia: 'Infosys stock rocketed on NASDAQ. Technology became India\'s national superpower.'
  },
  {
    year: 2008,
    title: 'Global Financial Crisis',
    tagline: 'Lehman collapse & the Great Dip',
    icon: '📉',
    marketTrivia: 'Markets crashed 50% in panic. But those who continued their monthly SIP created generational wealth!'
  },
  {
    year: 2014,
    title: 'Digital India & Smartphone Wave',
    tagline: '4G revolution, Jan Dhan & Aadhaar',
    icon: '📱',
    marketTrivia: 'Smartphones reached every Indian corner. UPI was conceptualized to change payments forever.'
  },
  {
    year: 2020,
    title: 'Covid Lockdown & Retail Boom',
    tagline: 'Work from home & Gen Z Demat rush',
    icon: '🔥',
    marketTrivia: 'After a sharp 35% March correction, Indian markets roared into the biggest retail bull run in history.'
  }
];

// Market cycle volatility multipliers by decade to render realistic historical charts
const MARKET_CYCLE_MODIFIERS = {
  1984: 1.15, 1985: 1.45, 1986: 0.90, 1987: 1.10, 1988: 1.25, 1989: 1.18, 1990: 1.30,
  1991: 1.40, 1992: 1.70, 1993: 0.85, 1994: 1.20, 1995: 0.92, 1996: 0.95, 1997: 1.12,
  1998: 0.88, 1999: 1.65, 2000: 0.82, 2001: 0.78, 2002: 1.05, 2003: 1.72, 2004: 1.18,
  2005: 1.42, 2006: 1.46, 2007: 1.55, 2008: 0.48, 2009: 1.82, 2010: 1.17, 2011: 0.76,
  2012: 1.27, 2013: 1.08, 2014: 1.32, 2015: 0.95, 2016: 1.04, 2017: 1.28, 2018: 1.05,
  2019: 1.12, 2020: 1.15, 2021: 1.25, 2022: 1.05, 2023: 1.20, 2024: 1.18, 2025: 1.14,
  2026: 1.08
};

/**
 * Calculates historical compounding SIP simulation
 * @param {number} startYear e.g. 1983 to 2025
 * @param {number} monthlySipAmount e.g. 500
 * @param {Array<{stockId: string, percentage: number}>} allocations
 * @returns Object with overall metrics and yearly time-series progression
 */
export function simulateCompounding({
  startYear = 1983,
  endYear = 2026,
  monthlySipAmount = 500,
  allocations = []
}) {
  const yearsSpan = Math.max(1, endYear - startYear);
  const totalMonths = yearsSpan * 12;
  const totalInvested = totalMonths * monthlySipAmount;

  // Build stock lookup
  const stockMap = new Map();
  TIME_MACHINE_STOCKS.forEach(s => stockMap.set(s.id, s));

  // If no allocations provided, default to Nifty benchmark
  const activeAllocations = allocations.length > 0 
    ? allocations 
    : [{ stockId: 'nifty', percentage: 100 }];

  // Track each stock's balance across years
  const stockStates = activeAllocations.map(alloc => {
    const stock = stockMap.get(alloc.stockId) || stockMap.get('nifty');
    return {
      stock,
      percentage: alloc.percentage,
      monthlyPortion: (monthlySipAmount * alloc.percentage) / 100,
      currentValue: 0,
      totalInvested: 0,
      effectiveStartYear: Math.max(startYear, stock.listingYear)
    };
  });

  const timeline = [];
  let cumulativeInvested = 0;

  // Year-by-year simulation
  for (let currentYear = startYear; currentYear <= endYear; currentYear++) {
    // Add 12 monthly deposits for each active stock
    stockStates.forEach(state => {
      if (currentYear >= state.effectiveStartYear) {
        const annualDeposit = state.monthlyPortion * 12;
        state.totalInvested += annualDeposit;
        
        // Annual growth factor derived from historical CAGR with market cycle modifier
        const baseRate = state.stock.cagr / 100;
        const cycleMod = MARKET_CYCLE_MODIFIERS[currentYear] || 1.12;
        // Blend long-term CAGR with year cycle
        const annualReturn = (baseRate * 0.7) + ((cycleMod - 1) * 0.3);

        // Standard future value of existing wealth + deposit compounding
        state.currentValue = (state.currentValue + annualDeposit) * (1 + annualReturn);
      } else {
        // Before listing: held in safe liquid cash growing at modest 7%
        const annualDeposit = state.monthlyPortion * 12;
        state.totalInvested += annualDeposit;
        state.currentValue = (state.currentValue + annualDeposit) * 1.07;
      }
    });

    cumulativeInvested += monthlySipAmount * 12;
    const yearTotalValue = stockStates.reduce((sum, s) => sum + s.currentValue, 0);

    // Timeline data point for Recharts
    const point = {
      year: currentYear,
      invested: Math.round(cumulativeInvested),
      totalValue: Math.round(yearTotalValue),
    };

    stockStates.forEach(s => {
      point[s.stock.id] = Math.round(s.currentValue);
    });

    timeline.push(point);
  }

  const finalTotalValue = Math.round(stockStates.reduce((sum, s) => sum + s.currentValue, 0));
  const absoluteGain = Math.max(0, finalTotalValue - totalInvested);
  const multiplier = (finalTotalValue / Math.max(1, totalInvested)).toFixed(1);

  // Approximate overall CAGR achieved
  const overallCagr = yearsSpan > 0 
    ? (((finalTotalValue / totalInvested) ** (1 / yearsSpan) - 1) * 100).toFixed(1)
    : '0';

  // Compare with traditional bank savings account (approx 4%) and gold (approx 8.5%)
  const savingsValue = Math.round(totalInvested * ((1 + 0.04) ** (yearsSpan / 2)));
  const goldValue = Math.round(totalInvested * ((1 + 0.085) ** (yearsSpan / 1.6)));

  // Generate Gen Z wealth real-world equivalents
  const equivalents = getWealthEquivalents(finalTotalValue);

  return {
    startYear,
    endYear,
    yearsSpan,
    monthlySipAmount,
    totalInvested,
    finalTotalValue,
    absoluteGain,
    multiplier,
    overallCagr,
    savingsValue,
    goldValue,
    equivalents,
    stockBreakdown: stockStates.map(s => ({
      stockId: s.stock.id,
      name: s.stock.name,
      ticker: s.stock.ticker,
      color: s.stock.color,
      avatar: s.stock.avatar,
      percentage: s.percentage,
      invested: Math.round(s.totalInvested),
      finalValue: Math.round(s.currentValue),
      gain: Math.round(s.currentValue - s.totalInvested),
      cagr: s.stock.cagr
    })),
    timeline
  };
}

export function formatIndianCurrency(amount) {
  if (amount == null) return '₹0';
  const num = Math.round(amount);
  if (num >= 10000000) {
    return `₹${(num / 10000000).toFixed(2)} Cr`;
  }
  if (num >= 100000) {
    return `₹${(num / 100000).toFixed(2)} Lakh`;
  }
  return `₹${num.toLocaleString('en-IN')}`;
}

function getWealthEquivalents(valuation) {
  const items = [];
  if (valuation >= 100000000) { // 10 Cr+
    items.push({
      icon: '🏰',
      title: 'Luxury South Mumbai Penthouses',
      count: Math.max(1, Math.floor(valuation / 70000000)),
      desc: 'Top floor sea-facing apartments outright with zero debt.'
    });
    items.push({
      icon: '🏎️',
      title: 'Porsche 911 GT3 RS Fleet',
      count: Math.max(1, Math.floor(valuation / 35000000)),
      desc: 'Top-tier supercar collection parked in your dream garage.'
    });
    items.push({
      icon: '👑',
      title: 'Generational Freedom Fund',
      count: 3,
      desc: 'Generations of children and grandchildren debt-free with perpetual dividend income.'
    });
  } else if (valuation >= 10000000) { // 1 Cr - 10 Cr
    items.push({
      icon: '🏙️',
      title: 'Prime City 3BHK Homes',
      count: Math.max(1, Math.floor(valuation / 15000000)),
      desc: 'High-end gated society apartments in Bengaluru / Mumbai.'
    });
    items.push({
      icon: '✈️',
      title: 'World Tour First-Class Trips',
      count: Math.max(1, Math.floor(valuation / 1200000)),
      desc: 'All continents covered staying at 5-star heritage hotels.'
    });
    items.push({
      icon: '☕',
      title: 'Full Financial Independence (FIRE)',
      count: 1,
      desc: 'Work only if you want to. Monthly passive dividends will cover all living expenses.'
    });
  } else {
    items.push({
      icon: '🚘',
      title: 'Electric Luxury Cars (Tesla / EV)',
      count: Math.max(1, Math.floor(valuation / 4000000)),
      desc: 'Drive the highest tech electric cars with zero EMI stress.'
    });
    items.push({
      icon: '🎓',
      title: 'Top Global University MBAs',
      count: Math.max(1, Math.floor(valuation / 3000000)),
      desc: 'Fully sponsored education at Harvard, Stanford, or INSEAD.'
    });
    items.push({
      icon: '📱',
      title: 'Latest iPhone Pro Max Models',
      count: Math.max(1, Math.floor(valuation / 150000)),
      desc: 'Yearly upgrades for you and your entire friend circle.'
    });
  }
  return items;
}
