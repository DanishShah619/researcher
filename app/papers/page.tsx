import { redirect } from "next/navigation";

export default function PapersIndexPage() {
  // Redirect /papers to the topic browser
  redirect("/researchtopics");
}
