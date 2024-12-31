import React, { useState, useCallback } from "react";
import { Card as CardComponent, AlertCircle, RefreshCw } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Card class definition
class Card {
  constructor(rank, suit) {
    this.rank = rank;
    this.suit = suit;
  }

  toString() {
    return `${this.rank}${this.suit}`;
  }
}

// Constants
const RANKS = [
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "J",
  "Q",
  "K",
  "A",
];
const SUITS = ["H", "D", "C", "S"];

const PokerCalculator = () => {
  const [holeCards, setHoleCards] = useState([null, null]);
  const [communityCards, setCommunityCards] = useState([
    null,
    null,
    null,
    null,
    null,
  ]);
  const [numOpponents, setNumOpponents] = useState(1);
  const [winProbability, setWinProbability] = useState(null);
  const [stage, setStage] = useState("preflop"); // preflop, flop, turn, river
  const [error, setError] = useState("");

  // Create deck
  const createDeck = useCallback(() => {
    const deck = [];
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        deck.push(new Card(rank, suit));
      }
    }
    return deck;
  }, []);

  // Validate card input
  const isValidCard = useCallback((input) => {
    if (!input) return false;
    input = input.toUpperCase();
    const rank = input.slice(0, -1);
    const suit = input.slice(-1);
    return RANKS.includes(rank) && SUITS.includes(suit);
  }, []);

  // Convert string to Card object
  const stringToCard = useCallback((str) => {
    if (!str) return null;
    str = str.toUpperCase();
    const rank = str.slice(0, -1);
    const suit = str.slice(-1);
    return new Card(rank, suit);
  }, []);

  // Evaluate hand strength (copied from original code)
  const evaluateHand = useCallback((cards) => {
    const ranks = cards.map((c) => RANKS.indexOf(c.rank));
    const suits = cards.map((c) => c.suit);

    const isFlush = suits.every((suit) => suit === suits[0]);

    const uniqueRanks = [...new Set(ranks)].sort((a, b) => a - b);
    const isStraight =
      uniqueRanks.length >= 5 &&
      uniqueRanks[uniqueRanks.length - 1] -
        uniqueRanks[uniqueRanks.length - 5] ===
        4;

    const rankCounts = ranks.reduce((acc, rank) => {
      acc[rank] = (acc[rank] || 0) + 1;
      return acc;
    }, {});

    const frequencies = Object.values(rankCounts).sort((a, b) => b - a);

    if (isFlush && isStraight) return 8;
    if (frequencies[0] === 4) return 7;
    if (frequencies[0] === 3 && frequencies[1] === 2) return 6;
    if (isFlush) return 5;
    if (isStraight) return 4;
    if (frequencies[0] === 3) return 3;
    if (frequencies[0] === 2 && frequencies[1] === 2) return 2;
    if (frequencies[0] === 2) return 1;
    return 0;
  }, []);

  // Shuffle array
  const shuffle = useCallback((array) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }, []);

  // Simulate hands
  const simulateHand = useCallback(
    (playerHole, communityCards, numOpponents) => {
      const numSimulations = 10000;
      let wins = 0;
      const deck = createDeck();

      const usedCards = [
        ...playerHole,
        ...communityCards.filter((c) => c !== null),
      ];
      const remainingDeck = deck.filter(
        (card) =>
          !usedCards.some(
            (c) => c && c.rank === card.rank && c.suit === card.suit
          )
      );

      for (let i = 0; i < numSimulations; i++) {
        const shuffledDeck = shuffle(remainingDeck);
        const neededCommunityCards =
          5 - communityCards.filter((c) => c !== null).length;
        const simulatedCommunityCards = [
          ...communityCards.filter((c) => c !== null),
          ...shuffledDeck.slice(0, neededCommunityCards),
        ];

        let playerWins = true;
        let currentDeckIndex = neededCommunityCards;

        for (let j = 0; j < numOpponents; j++) {
          const opponentHole = shuffledDeck.slice(
            currentDeckIndex,
            currentDeckIndex + 2
          );
          currentDeckIndex += 2;

          if (
            evaluateHand([...opponentHole, ...simulatedCommunityCards]) >=
            evaluateHand([...playerHole, ...simulatedCommunityCards])
          ) {
            playerWins = false;
            break;
          }
        }

        if (playerWins) wins++;
      }

      return wins / numSimulations;
    },
    [createDeck, shuffle, evaluateHand]
  );

  // Handle card input
  const handleCardInput = useCallback(
    (str, position, type) => {
      if (!str) {
        setError("");
        if (type === "hole") {
          const newHoleCards = [...holeCards];
          newHoleCards[position] = null;
          setHoleCards(newHoleCards);
        } else {
          const newCommunityCards = [...communityCards];
          newCommunityCards[position] = null;
          setCommunityCards(newCommunityCards);
        }
        return;
      }

      if (!isValidCard(str)) {
        setError("Invalid card format. Use format like: AH, 10S, KC, QD");
        return;
      }

      const card = stringToCard(str);
      const allCards = [...holeCards, ...communityCards].filter(
        (c) => c !== null
      );

      if (
        allCards.some((c) => c && c.rank === card.rank && c.suit === card.suit)
      ) {
        setError("Card already used");
        return;
      }

      setError("");
      if (type === "hole") {
        const newHoleCards = [...holeCards];
        newHoleCards[position] = card;
        setHoleCards(newHoleCards);
      } else {
        const newCommunityCards = [...communityCards];
        newCommunityCards[position] = card;
        setCommunityCards(newCommunityCards);
      }
    },
    [holeCards, communityCards, isValidCard, stringToCard]
  );

  // Calculate odds when cards change
  React.useEffect(() => {
    if (holeCards.every((c) => c) && numOpponents > 0) {
      const validCommunity = communityCards.filter((c) => c !== null);
      if (
        (stage === "flop" && validCommunity.length === 3) ||
        (stage === "turn" && validCommunity.length === 4) ||
        (stage === "river" && validCommunity.length === 5)
      ) {
        const prob = simulateHand(holeCards, communityCards, numOpponents);
        setWinProbability(prob);
      }
    }
  }, [holeCards, communityCards, numOpponents, stage, simulateHand]);

  // Reset the calculator
  const handleReset = () => {
    setHoleCards([null, null]);
    setCommunityCards([null, null, null, null, null]);
    setNumOpponents(1);
    setWinProbability(null);
    setStage("preflop");
    setError("");
  };

  // Determine which cards should be enabled based on stage
  const getEnabledCards = () => {
    switch (stage) {
      case "preflop":
        return [true, true, false, false, false, false, false];
      case "flop":
        return [true, true, true, true, true, false, false];
      case "turn":
        return [true, true, true, true, true, true, false];
      case "river":
        return [true, true, true, true, true, true, true];
      default:
        return [false, false, false, false, false, false, false];
    }
  };

  // Advance to next stage
  const advanceStage = () => {
    if (stage === "preflop" && holeCards.every((c) => c)) {
      setStage("flop");
    } else if (stage === "flop" && communityCards.slice(0, 3).every((c) => c)) {
      setStage("turn");
    } else if (stage === "turn" && communityCards.slice(0, 4).every((c) => c)) {
      setStage("river");
    }
  };

  const enabledCards = getEnabledCards();

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">🎲 Poker Hand Calculator</h1>
        <button
          onClick={handleReset}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          <RefreshCw size={16} /> Reset
        </button>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-6">
        {/* Hole Cards */}
        <div>
          <h2 className="text-lg font-semibold mb-2">Your Hole Cards</h2>
          <div className="flex gap-4">
            {holeCards.map((card, i) => (
              <input
                key={`hole-${i}`}
                type="text"
                value={card ? card.toString() : ""}
                onChange={(e) => handleCardInput(e.target.value, i, "hole")}
                placeholder="AH"
                disabled={!enabledCards[i]}
                className="w-20 p-2 border rounded text-center uppercase"
                maxLength={3}
              />
            ))}
          </div>
        </div>

        {/* Number of Opponents */}
        <div>
          <h2 className="text-lg font-semibold mb-2">Number of Opponents</h2>
          <input
            type="number"
            min="1"
            max="9"
            value={numOpponents}
            onChange={(e) => setNumOpponents(parseInt(e.target.value) || 1)}
            className="w-20 p-2 border rounded text-center"
          />
        </div>

        {/* Community Cards */}
        {stage !== "preflop" && (
          <div>
            <h2 className="text-lg font-semibold mb-2">Community Cards</h2>
            <div className="flex gap-4">
              {communityCards.map((card, i) => (
                <input
                  key={`community-${i}`}
                  type="text"
                  value={card ? card.toString() : ""}
                  onChange={(e) =>
                    handleCardInput(e.target.value, i, "community")
                  }
                  placeholder="AH"
                  disabled={!enabledCards[i + 2]}
                  className="w-20 p-2 border rounded text-center uppercase"
                  maxLength={3}
                />
              ))}
            </div>
          </div>
        )}

        {/* Win Probability */}
        {winProbability !== null && (
          <div className="mt-6">
            <h2 className="text-lg font-semibold mb-2">Win Probability</h2>
            <div
              className={`text-2xl font-bold ${
                winProbability >= 0.7
                  ? "text-green-500"
                  : winProbability >= 0.4
                  ? "text-yellow-500"
                  : "text-red-500"
              }`}
            >
              {(winProbability * 100).toFixed(2)}%
            </div>
          </div>
        )}

        {/* Next Stage Button */}
        {stage !== "river" && (
          <button
            onClick={advanceStage}
            disabled={
              (stage === "preflop" && !holeCards.every((c) => c)) ||
              (stage === "flop" &&
                !communityCards.slice(0, 3).every((c) => c)) ||
              (stage === "turn" && !communityCards.slice(0, 4).every((c) => c))
            }
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            Next Stage
          </button>
        )}
      </div>
    </div>
  );
};

export default PokerCalculator;
