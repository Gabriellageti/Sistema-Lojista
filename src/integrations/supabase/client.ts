// Supabase client explicitly disabled to avoid external connections
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
const DISABLED_MESSAGE = 'Supabase client is disabled in this environment.';

class DisabledQueryBuilder {
  private buildResponse() {
    return { data: null, error: new Error(DISABLED_MESSAGE) };
  }

  select() { return this; }
  insert() { return this; }
  update() { return this; }
  delete() { return this; }
  eq() { return this; }
  is() { return this; }
  not() { return this; }
  in() { return this; }
  or() { return this; }
  order() { return this; }
  limit() { return this; }
  range() { return this; }
  textSearch() { return this; }

  single() { return Promise.resolve(this.buildResponse()); }
  maybeSingle() { return Promise.resolve(this.buildResponse()); }

  // Allow awaiting the builder directly
  then(onFulfilled?: any, onRejected?: any) {
    return Promise.resolve(this.buildResponse()).then(onFulfilled, onRejected);
  }
}

class DisabledAuthApi {
  async signInWithPassword() {
    return { data: { session: null, user: null }, error: new Error(DISABLED_MESSAGE) };
  }

  onAuthStateChange() {
    return {
      data: {
        subscription: {
          unsubscribe: () => undefined,
        },
      },
      error: null,
    };
  }

  async getSession() {
    return { data: { session: null }, error: new Error(DISABLED_MESSAGE) };
  }

  async signOut() {
    return { error: null };
  }
}

export const supabase = {
  auth: new DisabledAuthApi(),
  from: () => new DisabledQueryBuilder(),
};
