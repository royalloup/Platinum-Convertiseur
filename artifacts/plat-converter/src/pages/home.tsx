import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRightLeft, Hexagon, Sparkles, Calculator, Zap, Crosshair, Globe, Eye, EyeOff } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import MusicPlayer from "@/components/MusicPlayer";
import BackgroundVideos from "@/components/BackgroundVideos";

type CurrencyCode = "EUR" | "USD" | "GBP" | "CAD" | "AUD" | "CHF" | "JPY" | "BRL";

interface Currency {
  code: CurrencyCode;
  label: string;
  symbol: string;
  flag: string;
  decimals: number;
  prices: number[];
}

const PLAT_AMOUNTS = [75, 170, 370, 1000, 2100, 4300];

const CURRENCIES: Record<CurrencyCode, Currency> = {
  EUR: {
    code: "EUR",
    label: "Euro",
    symbol: "€",
    flag: "France / Zone Euro",
    decimals: 2,
    prices: [4.99, 9.99, 19.99, 49.99, 99.99, 199.99],
  },
  USD: {
    code: "USD",
    label: "Dollar US",
    symbol: "$",
    flag: "États-Unis",
    decimals: 2,
    prices: [4.99, 9.99, 19.99, 49.99, 99.99, 199.99],
  },
  GBP: {
    code: "GBP",
    label: "Livre Sterling",
    symbol: "£",
    flag: "Royaume-Uni",
    decimals: 2,
    prices: [3.99, 7.99, 15.99, 39.99, 79.99, 159.99],
  },
  CAD: {
    code: "CAD",
    label: "Dollar Canadien",
    symbol: "C$",
    flag: "Canada",
    decimals: 2,
    prices: [6.99, 13.99, 27.99, 64.99, 129.99, 259.99],
  },
  AUD: {
    code: "AUD",
    label: "Dollar Australien",
    symbol: "A$",
    flag: "Australie",
    decimals: 2,
    prices: [6.99, 14.99, 29.99, 74.99, 149.99, 299.99],
  },
  CHF: {
    code: "CHF",
    label: "Franc Suisse",
    symbol: "CHF",
    flag: "Suisse",
    decimals: 2,
    prices: [4.99, 9.99, 19.99, 49.99, 99.99, 199.99],
  },
  JPY: {
    code: "JPY",
    label: "Yen Japonais",
    symbol: "¥",
    flag: "Japon",
    decimals: 0,
    prices: [600, 1200, 2400, 6000, 12000, 24000],
  },
  BRL: {
    code: "BRL",
    label: "Real Brésilien",
    symbol: "R$",
    flag: "Brésil",
    decimals: 2,
    prices: [24.99, 49.99, 99.99, 249.99, 499.99, 999.99],
  },
};

function buildTiers(currency: Currency) {
  return PLAT_AMOUNTS.map((plat, i) => ({ plat, price: currency.prices[i] }));
}

function formatPrice(value: number, currency: Currency) {
  return value.toFixed(currency.decimals);
}

function calculateOptimalPacks(targetPlat: number, tiers: { plat: number; price: number }[]) {
  if (targetPlat <= 0) return null;

  const maxSearch = targetPlat + tiers[tiers.length - 1].plat;
  const dp = new Array(maxSearch + 1).fill(Infinity);
  const choice = new Array(maxSearch + 1).fill(-1);

  dp[0] = 0;

  for (let i = 0; i <= maxSearch; i++) {
    if (dp[i] === Infinity) continue;
    for (let j = 0; j < tiers.length; j++) {
      const next = i + tiers[j].plat;
      if (next <= maxSearch && dp[i] + tiers[j].price < dp[next]) {
        dp[next] = dp[i] + tiers[j].price;
        choice[next] = j;
      }
    }
  }

  let minCost = Infinity;
  let bestPlat = -1;
  for (let i = targetPlat; i <= maxSearch; i++) {
    if (dp[i] < minCost) {
      minCost = dp[i];
      bestPlat = i;
    }
  }

  if (bestPlat === -1) return null;

  const packs = new Map<number, number>();
  let current = bestPlat;
  while (current > 0) {
    const tierIdx = choice[current];
    if (tierIdx === -1) break;
    const tier = tiers[tierIdx];
    packs.set(tier.plat, (packs.get(tier.plat) || 0) + 1);
    current -= tier.plat;
  }

  const combinationPacks = Array.from(packs.entries())
    .map(([plat, count]) => ({
      plat,
      count,
      price: tiers.find((t) => t.plat === plat)!.price,
    }))
    .sort((a, b) => b.plat - a.plat);

  const singleNextUpPack = tiers.find((t) => t.plat >= targetPlat);

  return {
    totalPlat: bestPlat,
    totalPrice: minCost,
    packs: combinationPacks,
    singleNextUpPack: singleNextUpPack,
    showNextUp:
      singleNextUpPack &&
      (singleNextUpPack.plat !== bestPlat || combinationPacks.length > 1) &&
      singleNextUpPack.price <= minCost * 1.5,
  };
}

export default function Home() {
  const [currencyCode, setCurrencyCode] = useState<CurrencyCode>("EUR");
  const [platInput, setPlatInput] = useState<string>("");
  const [moneyInput, setMoneyInput] = useState<string>("");
  const [activeInput, setActiveInput] = useState<"plat" | "money" | null>(null);
  const [converterVisible, setConverterVisible] = useState<boolean>(true);

  const currency = CURRENCIES[currencyCode];
  const tiers = useMemo(() => buildTiers(currency), [currency]);
  const bestTier = tiers[tiers.length - 1];
  const conversionRate = bestTier.price / bestTier.plat;

  const handleCurrencyChange = (code: string) => {
    const newCurrency = CURRENCIES[code as CurrencyCode];
    setCurrencyCode(code as CurrencyCode);
    // Recompute money from plat with new rate so values stay in sync
    const newTiers = buildTiers(newCurrency);
    const newRate = newTiers[newTiers.length - 1].price / newTiers[newTiers.length - 1].plat;
    if (platInput && !isNaN(Number(platInput))) {
      setMoneyInput((Number(platInput) * newRate).toFixed(newCurrency.decimals));
    }
  };

  const handlePlatChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setPlatInput(val);
    if (!val || isNaN(Number(val))) {
      setMoneyInput("");
      return;
    }
    const plat = Number(val);
    setMoneyInput((plat * conversionRate).toFixed(currency.decimals));
  };

  const handleMoneyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setMoneyInput(val);
    if (!val || isNaN(Number(val))) {
      setPlatInput("");
      return;
    }
    const money = Number(val);
    setPlatInput(Math.floor(money / conversionRate).toString());
  };

  const optimalPacks = useMemo(() => {
    const p = Number(platInput);
    if (!p || isNaN(p) || p <= 0) return null;
    return calculateOptimalPacks(p, tiers);
  }, [platInput, tiers]);

  return (
    <div className="min-h-[100dvh] w-full relative overflow-x-hidden text-foreground pb-20">
      <BackgroundVideos dimmed={converterVisible} />
      <div className="scanline" />

      <button
        onClick={() => setConverterVisible((v) => !v)}
        aria-label={converterVisible ? "Masquer le convertisseur" : "Afficher le convertisseur"}
        className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2 bg-card/90 backdrop-blur border border-primary/40 text-primary uppercase text-[10px] tracking-[0.3em] font-mono hover:bg-primary/10 hover:border-primary transition-all shadow-[0_0_20px_rgba(0,240,255,0.15)]"
      >
        {converterVisible ? (
          <>
            <EyeOff className="w-4 h-4" />
            <span>Masquer</span>
          </>
        ) : (
          <>
            <Eye className="w-4 h-4" />
            <span>Afficher le convertisseur</span>
          </>
        )}
      </button>

      <AnimatePresence>
        {converterVisible && (
          <motion.div
            key="converter-wrapper"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.35 }}
            className="max-w-6xl mx-auto px-4 py-12 relative z-10"
          >
        <header className="mb-10 text-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center justify-center p-4 mb-6 rounded-none bg-primary/10 text-primary border border-primary/30 glow-border"
          >
            <Hexagon className="w-10 h-10" />
          </motion.div>
          <motion.h1
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-4xl md:text-6xl font-bold mb-3 tracking-widest uppercase glow-text font-sans"
          >
            Convertisseur Platinum
          </motion.h1>
          <motion.p
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-muted-foreground text-lg uppercase tracking-widest flex items-center justify-center gap-2 font-mono"
          >
            <Crosshair className="w-4 h-4 text-secondary" /> Console d'opérateur Tenno
          </motion.p>
        </header>

        {/* Currency Selector */}
        <motion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.25 }}
          className="mb-8 flex flex-col sm:flex-row items-center justify-center gap-3"
        >
          <div className="flex items-center gap-2 text-muted-foreground uppercase text-xs tracking-widest font-mono">
            <Globe className="w-4 h-4 text-primary" />
            Devise / Région
          </div>
          <Select value={currencyCode} onValueChange={handleCurrencyChange}>
            <SelectTrigger className="w-[280px] h-11 bg-card/80 border-primary/40 rounded-none font-mono uppercase tracking-wider text-sm hover:border-primary/70 transition-colors">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-card border-primary/40 rounded-none font-mono">
              {Object.values(CURRENCIES).map((c) => (
                <SelectItem
                  key={c.code}
                  value={c.code}
                  className="rounded-none uppercase tracking-wider text-sm focus:bg-primary/10 focus:text-primary"
                >
                  <span className="text-primary mr-2">{c.symbol}</span>
                  {c.code} — {c.flag}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Main Converter */}
          <div className="lg:col-span-5 space-y-6">
            <motion.div
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <Card className="border-primary/50 bg-card/80 backdrop-blur glow-border rounded-none relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50 group-hover:opacity-100 transition-opacity" />
                <CardHeader>
                  <CardTitle className="uppercase tracking-widest flex items-center gap-2 text-xl font-sans font-bold">
                    <Calculator className="w-5 h-5 text-primary" />
                    Calculateur Rapide
                  </CardTitle>
                  <CardDescription className="text-muted-foreground font-mono text-xs">
                    Taux basé sur le meilleur pack : {conversionRate.toFixed(currency.decimals === 0 ? 2 : 4)} {currency.symbol} / plat
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label
                      className={`uppercase tracking-wider text-xs font-bold transition-colors ${
                        activeInput === "plat" ? "text-primary" : "text-muted-foreground"
                      }`}
                    >
                      Montant en Platinum
                    </Label>
                    <div className="relative">
                      <Input
                        type="number"
                        value={platInput}
                        onChange={handlePlatChange}
                        onFocus={() => setActiveInput("plat")}
                        onBlur={() => setActiveInput(null)}
                        className={`h-16 bg-background border-primary/30 text-2xl font-mono px-14 rounded-none transition-all duration-300 ${
                          activeInput === "plat"
                            ? "ring-1 ring-primary border-primary shadow-[0_0_15px_rgba(0,240,255,0.2)]"
                            : "hover:border-primary/50"
                        }`}
                        placeholder="0"
                      />
                      <Hexagon
                        className={`w-6 h-6 absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${
                          activeInput === "plat" ? "text-primary glow-text" : "text-muted-foreground"
                        }`}
                      />
                    </div>
                  </div>

                  <div className="flex justify-center">
                    <div className="bg-background/80 p-3 rounded-none border border-border">
                      <ArrowRightLeft className="w-5 h-5 text-muted-foreground" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label
                      className={`uppercase tracking-wider text-xs font-bold transition-colors ${
                        activeInput === "money" ? "text-secondary" : "text-muted-foreground"
                      }`}
                    >
                      Équivalent en {currency.label} ({currency.symbol})
                    </Label>
                    <div className="relative">
                      <Input
                        type="number"
                        value={moneyInput}
                        onChange={handleMoneyChange}
                        onFocus={() => setActiveInput("money")}
                        onBlur={() => setActiveInput(null)}
                        className={`h-16 bg-background border-secondary/30 text-2xl font-mono pl-20 pr-4 rounded-none transition-all duration-300 ${
                          activeInput === "money"
                            ? "ring-1 ring-secondary border-secondary shadow-[0_0_15px_rgba(255,200,0,0.2)]"
                            : "hover:border-secondary/50"
                        }`}
                        placeholder={currency.decimals === 0 ? "0" : "0.00"}
                      />
                      <span
                        className={`absolute left-5 top-1/2 -translate-y-1/2 font-bold text-xl font-mono transition-colors ${
                          activeInput === "money" ? "text-secondary" : "text-muted-foreground"
                        }`}
                      >
                        {currency.symbol}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Optimal Packs Section */}
            <AnimatePresence>
              {optimalPacks && (
                <motion.div
                  initial={{ opacity: 0, height: 0, marginTop: 0 }}
                  animate={{ opacity: 1, height: "auto", marginTop: 24 }}
                  exit={{ opacity: 0, height: 0, marginTop: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <Card className="border-secondary/40 bg-card/60 backdrop-blur rounded-none relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-secondary" />
                    <CardHeader className="pb-3">
                      <CardTitle className="uppercase tracking-widest text-secondary flex items-center gap-2 text-sm font-sans font-bold">
                        <Sparkles className="w-4 h-4" />
                        Combinaison Optimale
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-4 font-sans">
                        Pour obtenir au moins{" "}
                        <span className="font-mono text-primary font-bold text-base glow-text">
                          {platInput}
                        </span>{" "}
                        platinum, voici la configuration la plus économique :
                      </p>

                      <div className="space-y-2 mb-4">
                        {optimalPacks.packs.map((pack, i) => (
                          <div
                            key={i}
                            className="flex justify-between items-center bg-background/80 p-3 border border-border/50 hover:border-secondary/30 transition-colors"
                          >
                            <span className="font-mono text-sm">
                              <span className="text-secondary font-bold mr-2">{pack.count}×</span>{" "}
                              Pack {pack.plat}
                            </span>
                            <span className="font-mono text-sm text-foreground">
                              {formatPrice(pack.price * pack.count, currency)} {currency.symbol}
                            </span>
                          </div>
                        ))}
                      </div>

                      <div className="flex justify-between items-center pt-4 border-t border-border mb-4">
                        <div>
                          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1 font-sans">
                            Total Obtenu
                          </p>
                          <p className="font-mono text-primary font-bold text-lg">
                            {optimalPacks.totalPlat} plat
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1 font-sans">
                            Coût Total
                          </p>
                          <p className="font-mono text-secondary font-bold text-lg">
                            {formatPrice(optimalPacks.totalPrice, currency)} {currency.symbol}
                          </p>
                        </div>
                      </div>

                      {optimalPacks.showNextUp && optimalPacks.singleNextUpPack && (
                        <div className="pt-4 border-t border-dashed border-border/60">
                          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3 font-sans">
                            Alternative Simple
                          </p>
                          <div className="flex justify-between items-center bg-primary/5 p-3 border border-primary/20">
                            <span className="font-mono text-sm text-foreground">
                              1× Pack {optimalPacks.singleNextUpPack.plat}
                            </span>
                            <span className="font-mono text-sm text-primary font-bold">
                              {formatPrice(optimalPacks.singleNextUpPack.price, currency)}{" "}
                              {currency.symbol}
                            </span>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Tiers Grid */}
          <div className="lg:col-span-7">
            <motion.div
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-primary" />
                  <h2 className="text-xl font-bold uppercase tracking-widest font-sans">
                    Tarifs Officiels (PC) — {currency.flag}
                  </h2>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {tiers.map((tier, index) => {
                  const isBest = tier.plat === bestTier.plat;
                  const ratio = tier.price / tier.plat;
                  const ratioDecimals = currency.decimals === 0 ? 2 : 4;

                  return (
                    <motion.div
                      key={`${currency.code}-${tier.plat}`}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: 0.4 + index * 0.06 }}
                    >
                      <Card
                        className={`relative rounded-none transition-all duration-300 hover:-translate-y-1 h-full flex flex-col ${
                          isBest
                            ? "border-primary bg-primary/5 shadow-[0_0_20px_rgba(0,240,255,0.1)]"
                            : "border-border bg-card/40 hover:border-primary/40 hover:bg-card/80"
                        }`}
                      >
                        {isBest && (
                          <div className="absolute -top-3 -right-3 bg-primary text-primary-foreground text-[10px] font-bold px-3 py-1.5 uppercase tracking-widest shadow-[0_0_10px_rgba(0,240,255,0.5)] z-10">
                            Meilleur Taux
                          </div>
                        )}

                        <div
                          className={`absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 ${
                            isBest ? "border-primary" : "border-muted-foreground/30"
                          }`}
                        />
                        <div
                          className={`absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 ${
                            isBest ? "border-primary" : "border-muted-foreground/30"
                          }`}
                        />

                        <CardContent className="p-6 flex-1 flex flex-col justify-between">
                          <div className="flex justify-between items-start mb-6">
                            <div className="flex items-center gap-3">
                              <Hexagon
                                className={`w-8 h-8 ${
                                  isBest ? "text-primary glow-text" : "text-muted-foreground"
                                }`}
                              />
                              <span
                                className={`text-3xl font-mono font-bold tracking-tight ${
                                  isBest ? "text-primary glow-text" : "text-foreground"
                                }`}
                              >
                                {tier.plat}
                              </span>
                            </div>
                            <span className="text-2xl font-mono text-foreground tracking-tight">
                              {formatPrice(tier.price, currency)} {currency.symbol}
                            </span>
                          </div>

                          <div className="flex justify-between items-center pt-4 border-t border-border/40 text-sm">
                            <span className="text-muted-foreground uppercase text-xs tracking-widest font-sans font-medium">
                              Taux de conversion
                            </span>
                            <span className="font-mono text-muted-foreground">
                              {ratio.toFixed(ratioDecimals)} {currency.symbol} / p
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          </div>
        </div>

        <footer className="mt-12 pt-6 border-t border-cyan-500/20 text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500 font-mono">
            Créé par <span className="text-cyan-400">Nuage02</span>
          </p>
        </footer>
          </motion.div>
        )}
      </AnimatePresence>

      <MusicPlayer />
    </div>
  );
}
