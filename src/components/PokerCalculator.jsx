import React, { useState, useCallback } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";

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

// Alert component
const Alert = ({ children, variant = "default" }) => (
  <div
    className={`p-4 rounded-lg border ${
      variant === "destructive"
        ? "border-red-500 text-red-500"
        : "border-gray-200"
    }`}
  >
    {children}
  </div>
);

const AlertDescription = ({ children }) => (
  <div className="text-sm">{children}</div>
);

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
const HAND_RANKINGS = {
  STRAIGHT_FLUSH: 8,
  FOUR_OF_A_KIND: 7,
  FULL_HOUSE: 6,
  FLUSH: 5,
  STRAIGHT: 4,
  THREE_OF_A_KIND: 3,
  TWO_PAIR: 2,
  ONE_PAIR: 1,
  HIGH_CARD: 0,
};

const PokerCalculator = () => {
  const [holeCards, setHoleCards] = useState([null, null]);
  const [holeInputs, setHoleInputs] = useState(["", ""]);
  const [communityCards, setCommunityCards] = useState([
    null,
    null,
    null,
    null,
    null,
  ]);
  const [communityInputs, setCommunityInputs] = useState(["", "", "", "", ""]);
  const [numOpponents, setNumOpponents] = useState(1);
  const [winProbability, setWinProbability] = useState(null);
  const [stage, setStage] = useState("preflop");
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

  // Validate and convert input to card
  const validateCard = useCallback((str) => {
    if (!str) return null;

    str = str.toUpperCase().trim();
    let rank, suit;

    if (str.startsWith("10")) {
      rank = "10";
      suit = str.slice(2);
    } else {
      rank = str.slice(0, -1);
      suit = str.slice(-1);
    }

    if (!RANKS.includes(rank) || !SUITS.includes(suit)) {
      return null;
    }

    return new Card(rank, suit);
  }, []);

  // Handle raw input change
  const handleInputChange = useCallback(
    (value, position, type) => {
      const newValue = value.toUpperCase();

      if (type === "hole") {
        const newInputs = [...holeInputs];
        newInputs[position] = newValue;
        setHoleInputs(newInputs);

        if (newValue.length === 2 || newValue.length === 3) {
          const card = validateCard(newValue);
          if (card) {
            const newHoleCards = [...holeCards];
            newHoleCards[position] = card;
            setHoleCards(newHoleCards);
            setError("");
          } else if (!newValue.startsWith("10")) {
            setError("Invalid card format. Use format like: AH, 10S, KC, QD");
          }
        }
      } else {
        const newInputs = [...communityInputs];
        newInputs[position] = newValue;
        setCommunityInputs(newInputs);

        if (newValue.length === 2 || newValue.length === 3) {
          const card = validateCard(newValue);
          if (card) {
            const newCommunityCards = [...communityCards];
            newCommunityCards[position] = card;
            setCommunityCards(newCommunityCards);
            setError("");
          } else if (!newValue.startsWith("10")) {
            setError("Invalid card format. Use format like: AH, 10S, KC, QD");
          }
        }
      }
    },
    [holeInputs, holeCards, communityInputs, communityCards, validateCard]
  );

  const shuffle = useCallback((array) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }, []);

  const getRankValue = useCallback((rank) => {
    return RANKS.indexOf(rank);
  }, []);

  const evaluateHand = useCallback(
    (cards) => {
      if (cards.length < 5) return { rank: -1, value: 0 };

      // Convert cards to values and sort them
      const rankValues = cards
        .map((card) => getRankValue(card.rank))
        .sort((a, b) => b - a);
      const suits = cards.map((card) => card.suit);

      // Count frequencies of each rank
      const rankFrequencies = {};
      rankValues.forEach((value) => {
        rankFrequencies[value] = (rankFrequencies[value] || 0) + 1;
      });

      // Helper function to check for straight
      const checkStraight = (values) => {
        for (let i = 0; i <= values.length - 5; i++) {
          if (values[i] - values[i + 4] === 4) return true;
        }
        // Check for Ace-low straight (A-5)
        if (
          values.includes(12) && // Ace
          values.includes(3) && // 5
          values.includes(2) && // 4
          values.includes(1) && // 3
          values.includes(0)
        )
          // 2
          return true;
        return false;
      };

      // Check for flush
      const isFlush = suits.some(
        (suit) => suits.filter((s) => s === suit).length >= 5
      );

      // Check for straight
      const uniqueRanks = [...new Set(rankValues)].sort((a, b) => b - a);
      const isStraight = checkStraight(uniqueRanks);

      // Get frequencies in descending order
      const frequencies = Object.values(rankFrequencies).sort((a, b) => b - a);

      // Calculate hand value
      let handValue = rankValues[0] * 13 ** 4; // High card value
      for (let i = 1; i < 5; i++) {
        handValue += (rankValues[i] || 0) * 13 ** (4 - i);
      }

      // Determine hand rank and total value
      if (isFlush && isStraight) {
        return { rank: HAND_RANKINGS.STRAIGHT_FLUSH, value: handValue };
      }
      if (frequencies[0] === 4) {
        return { rank: HAND_RANKINGS.FOUR_OF_A_KIND, value: handValue };
      }
      if (frequencies[0] === 3 && frequencies[1] === 2) {
        return { rank: HAND_RANKINGS.FULL_HOUSE, value: handValue };
      }
      if (isFlush) {
        return { rank: HAND_RANKINGS.FLUSH, value: handValue };
      }
      if (isStraight) {
        return { rank: HAND_RANKINGS.STRAIGHT, value: handValue };
      }
      if (frequencies[0] === 3) {
        return { rank: HAND_RANKINGS.THREE_OF_A_KIND, value: handValue };
      }
      if (frequencies[0] === 2 && frequencies[1] === 2) {
        return { rank: HAND_RANKINGS.TWO_PAIR, value: handValue };
      }
      if (frequencies[0] === 2) {
        return { rank: HAND_RANKINGS.ONE_PAIR, value: handValue };
      }
      return { rank: HAND_RANKINGS.HIGH_CARD, value: handValue };
    },
    [getRankValue]
  );

  const compareHands = useCallback((hand1, hand2) => {
    if (hand1.rank !== hand2.rank) {
      return hand1.rank - hand2.rank;
    }
    return hand1.value - hand2.value;
  }, []);

  const simulateHand = useCallback(
    (playerHole, communityCards, numOpponents) => {
      const numSimulations = 10000;
      let wins = 0;
      let ties = 0;
      const deck = createDeck();

      // Remove known cards from deck
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
        let deckIndex = 0;

        // Complete community cards if needed
        const simulatedCommunity = [...communityCards];
        for (let j = 0; j < simulatedCommunity.length; j++) {
          if (simulatedCommunity[j] === null) {
            simulatedCommunity[j] = shuffledDeck[deckIndex++];
          }
        }

        // Evaluate player's hand
        const playerHand = evaluateHand([...playerHole, ...simulatedCommunity]);
        let playerWins = true;
        let isTie = false;

        // Simulate opponent hands
        for (let j = 0; j < numOpponents; j++) {
          const opponentHole = [
            shuffledDeck[deckIndex++],
            shuffledDeck[deckIndex++],
          ];
          const opponentHand = evaluateHand([
            ...opponentHole,
            ...simulatedCommunity,
          ]);

          const comparison = compareHands(playerHand, opponentHand);
          if (comparison < 0) {
            playerWins = false;
            isTie = false;
            break;
          } else if (comparison === 0) {
            playerWins = false;
            isTie = true;
          }
        }

        if (playerWins) wins++;
        else if (isTie) ties++;
      }

      return (wins + ties * 0.5) / numSimulations;
    },
    [createDeck, shuffle, evaluateHand, compareHands]
  );

  const handleReset = useCallback(() => {
    setHoleCards([null, null]);
    setHoleInputs(["", ""]);
    setCommunityCards([null, null, null, null, null]);
    setCommunityInputs(["", "", "", "", ""]);
    setNumOpponents(1);
    setWinProbability(null);
    setError("");
  }, []);

  React.useEffect(() => {
    if (holeCards.every((c) => c) && numOpponents > 0) {
      const validCommunity = communityCards.filter((c) => c !== null);

      if (validCommunity.length === 0) {
        // Preflop
        const prob = simulateHand(
          holeCards,
          [null, null, null, null, null],
          numOpponents
        );
        setWinProbability(prob);
      } else if (
        validCommunity.length === 3 ||
        validCommunity.length === 4 ||
        validCommunity.length === 5
      ) {
        // Calculate odds whenever we have flop (3), turn (4), or river (5) cards
        const prob = simulateHand(holeCards, communityCards, numOpponents);
        setWinProbability(prob);
      }
    }
  }, [holeCards, communityCards, numOpponents, simulateHand]);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">♥️ Poker Hand Calculator ♦️</h1>
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
            {holeInputs.map((input, i) => (
              <input
                key={`hole-${i}`}
                type="text"
                value={input}
                onChange={(e) => handleInputChange(e.target.value, i, "hole")}
                placeholder="AH"
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
        <div>
          <h2 className="text-lg font-semibold mb-2">Community Cards</h2>
          <div className="flex gap-4">
            {communityInputs.map((input, i) => (
              <input
                key={`community-${i}`}
                type="text"
                value={input}
                onChange={(e) =>
                  handleInputChange(e.target.value, i, "community")
                }
                placeholder="AH"
                className="w-20 p-2 border rounded text-center uppercase"
                maxLength={3}
              />
            ))}
          </div>
        </div>

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
      </div>
    </div>
  );
};

export default PokerCalculator;
