# syntax = docker/dockerfile:1

FROM ruby:3.2.2-slim-bullseye as base

# Install dependencies
RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y \
    build-essential \
    curl \
    git \
    libpq-dev \
    pkg-config \
    nodejs \
    npm && \
    rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /rails

# Set production environment
ENV RAILS_ENV="production" \
    BUNDLE_WITHOUT="development:test" \
    BUNDLE_DEPLOYMENT="1"

# Install JavaScript dependencies
COPY package.json package-lock.json ./
RUN npm install

# Install Ruby dependencies
COPY Gemfile Gemfile.lock ./
RUN bundle install

# Copy application code
COPY . .

# Precompile bootsnap code for faster boot times
RUN bundle exec bootsnap precompile --gemfile app/ lib/

# Precompile assets
RUN SECRET_KEY_BASE=dummy ./bin/rails assets:precompile

# Add permissions
RUN mkdir -p tmp/pids && \
    mkdir -p tmp/sockets && \
    chmod -R 777 tmp/ && \
    chmod -R 777 log/ && \
    chmod +x bin/*

EXPOSE 8080

# Start the server by default
CMD ["./bin/rails", "server", "-b", "0.0.0.0"]