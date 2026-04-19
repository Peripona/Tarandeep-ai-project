import type { GrammarLesson, VocabDeck } from "@/lib/types";

// A1 Vocabulary
import deckBasics from "./vocabulary/a1-basics.json";
import deckColors from "./vocabulary/a1-colors.json";
import deckDaily from "./vocabulary/a1-daily-routines.json";
import deckDirections from "./vocabulary/a1-directions.json";
import deckFamily from "./vocabulary/a1-family.json";
import deckFood from "./vocabulary/a1-food.json";
import deckGreetings from "./vocabulary/a1-greetings.json";
import deckNumbers from "./vocabulary/a1-numbers.json";

// A2 Vocabulary
import deckA2Travel from "./vocabulary/a2-travel.json";
import deckA2Weather from "./vocabulary/a2-weather.json";
import deckA2Shopping from "./vocabulary/a2-shopping.json";
import deckA2Health from "./vocabulary/a2-health.json";
import deckA2Hobbies from "./vocabulary/a2-hobbies.json";

// B1 Vocabulary
import deckB1Work from "./vocabulary/b1-work.json";
import deckB1Environment from "./vocabulary/b1-environment.json";
import deckB1Media from "./vocabulary/b1-media.json";
import deckB1Emotions from "./vocabulary/b1-emotions.json";

// B2 Vocabulary
import deckB2Politics from "./vocabulary/b2-politics.json";
import deckB2Economy from "./vocabulary/b2-economy.json";
import deckB2Science from "./vocabulary/b2-science.json";

// C1 Vocabulary
import deckC1Academic from "./vocabulary/c1-academic.json";
import deckC1Idioms from "./vocabulary/c1-idioms.json";

// C2 Vocabulary
import deckC2Nuanced from "./vocabulary/c2-nuanced.json";
import deckC2Register from "./vocabulary/c2-register.json";

// A1 Grammar
import grammarArticles from "./grammar/a1-articles.json";
import grammarNegation from "./grammar/a1-negation.json";
import grammarPronouns from "./grammar/a1-personal-pronouns.json";
import grammarPresent from "./grammar/a1-present-tense.json";
import grammarSeinHaben from "./grammar/a1-sein-haben.json";
import grammarWordOrder from "./grammar/a1-word-order.json";

// A2 Grammar
import grammarA2Perfekt from "./grammar/a2-perfekt.json";
import grammarA2ModalVerbs from "./grammar/a2-modal-verbs.json";
import grammarA2Akkusativ from "./grammar/a2-akkusativ.json";
import grammarA2Dativ from "./grammar/a2-dativ.json";

// B1 Grammar
import grammarB1SubordinateClauses from "./grammar/b1-subordinate-clauses.json";
import grammarB1Passive from "./grammar/b1-passive.json";
import grammarB1KonjunktivII from "./grammar/b1-konjunktiv-ii.json";
import grammarB1TwoWayPrepositions from "./grammar/b1-two-way-prepositions.json";

// B2 Grammar
import grammarB2KonjunktivI from "./grammar/b2-konjunktiv-i.json";
import grammarB2RelativeClauses from "./grammar/b2-relative-clauses.json";
import grammarB2InfinitiveClauses from "./grammar/b2-infinitive-clauses.json";

// C1 Grammar
import grammarC1Nominalization from "./grammar/c1-nominalization.json";
import grammarC1ExtendedAttributes from "./grammar/c1-extended-attributes.json";

// C2 Grammar
import grammarC2DiscourseMarkers from "./grammar/c2-discourse-markers.json";

export const vocabDecks: VocabDeck[] = [
  // A1
  deckGreetings as VocabDeck,
  deckNumbers as VocabDeck,
  deckColors as VocabDeck,
  deckFamily as VocabDeck,
  deckFood as VocabDeck,
  deckDirections as VocabDeck,
  deckDaily as VocabDeck,
  deckBasics as VocabDeck,
  // A2
  deckA2Travel as VocabDeck,
  deckA2Weather as VocabDeck,
  deckA2Shopping as VocabDeck,
  deckA2Health as VocabDeck,
  deckA2Hobbies as VocabDeck,
  // B1
  deckB1Work as VocabDeck,
  deckB1Environment as VocabDeck,
  deckB1Media as VocabDeck,
  deckB1Emotions as VocabDeck,
  // B2
  deckB2Politics as VocabDeck,
  deckB2Economy as VocabDeck,
  deckB2Science as VocabDeck,
  // C1
  deckC1Academic as VocabDeck,
  deckC1Idioms as VocabDeck,
  // C2
  deckC2Nuanced as VocabDeck,
  deckC2Register as VocabDeck,
];

export const grammarLessons: GrammarLesson[] = [
  // A1
  grammarArticles as GrammarLesson,
  grammarPronouns as GrammarLesson,
  grammarPresent as GrammarLesson,
  grammarSeinHaben as GrammarLesson,
  grammarNegation as GrammarLesson,
  grammarWordOrder as GrammarLesson,
  // A2
  grammarA2Perfekt as GrammarLesson,
  grammarA2ModalVerbs as GrammarLesson,
  grammarA2Akkusativ as GrammarLesson,
  grammarA2Dativ as GrammarLesson,
  // B1
  grammarB1SubordinateClauses as GrammarLesson,
  grammarB1Passive as GrammarLesson,
  grammarB1KonjunktivII as GrammarLesson,
  grammarB1TwoWayPrepositions as GrammarLesson,
  // B2
  grammarB2KonjunktivI as GrammarLesson,
  grammarB2RelativeClauses as GrammarLesson,
  grammarB2InfinitiveClauses as GrammarLesson,
  // C1
  grammarC1Nominalization as GrammarLesson,
  grammarC1ExtendedAttributes as GrammarLesson,
  // C2
  grammarC2DiscourseMarkers as GrammarLesson,
];

export function getDeckById(id: string): VocabDeck | undefined {
  return vocabDecks.find((d) => d.id === id);
}

export function getAllCardIds(): string[] {
  return vocabDecks.flatMap((d) => d.cards.map((c) => c.id));
}

export function getLessonById(id: string): GrammarLesson | undefined {
  return grammarLessons.find((l) => l.id === id);
}
