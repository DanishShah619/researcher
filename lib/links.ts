interface AuthorRef {
  id: string;
  name: string;
}

/**
 * Builds a /path_tracer deep link. Names travel with the ids so the tracer can
 * render the selection without fetching each author's full profile.
 */
export function pathTracerHref(a: AuthorRef, b?: AuthorRef): string {
  const params = new URLSearchParams({ authorA: a.id, nameA: a.name });
  if (b) {
    params.set("authorB", b.id);
    params.set("nameB", b.name);
  }
  return `/path_tracer?${params.toString()}`;
}
