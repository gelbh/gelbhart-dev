FactoryBot.define do
  factory :pacman_score do
    sequence(:player_name) { |n| "Player#{n}" }
    score { Faker::Number.between(from: 100, to: 10000) }
    is_win { [true, false].sample }
    played_at { Faker::Time.between(from: 1.month.ago, to: Time.current) }

    trait :win do
      is_win { true }
    end

    trait :loss do
      is_win { false }
    end

    trait :high_score do
      score { Faker::Number.between(from: 5000, to: 50000) }
      is_win { true }
    end

    trait :recent do
      played_at { Time.current }
    end

    trait :old do
      played_at { 1.year.ago }
    end
  end
end

