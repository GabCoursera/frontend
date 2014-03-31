package test

import org.scalatest.{ FeatureSpec, GivenWhenThen }
import org.scalatest.Matchers
import collection.JavaConversions._
import tools.MatchListFeatureTools

class ResultsFeatureTest extends FeatureSpec with GivenWhenThen with Matchers with MatchListFeatureTools {

  feature("Football Results") {

    scenario("Visit the results page") {

      Given("I visit the results page")

      HtmlUnit("/football/results") { browser =>
        import browser._

        val matches = $(".football-match__team")

        Then("I should see results for previous days")
        assertTeamWithScore(matches, "Sunderland", "1")
        assertTeamWithScore(matches, "West Ham", "1")
        assertTeamWithScore(matches, "Wigan", "1")
        assertTeamWithScore(matches, "Everton", "1")
        assertTeamWithScore(matches, "Bolton", "1")
        assertTeamWithScore(matches, "Derby", "1")
        assertTeamWithScore(matches, "Fulham", "0")
        assertTeamWithScore(matches, "Norwich", "0")

        And("I should not see today's live matches")
        assertNotTeamWithScore(matches, "Arsenal", "1")
        assertNotTeamWithScore(matches, "Spurs", "0")

        And("Matches should not contain form")
        $(".football-team__form").size() should be(0)
      }
    }

    scenario("Next results") {
      Given("I am on the results page")
      HtmlUnit("/football/results") { browser =>
        import browser._

        And("I click the 'next' results link")
        findFirst("[data-link-name=next]").click()

        Then("I should see additional results")
        val matches = $(".football-match__team")
        assertTeamWithScore(matches, "Stoke", "1")
        assertTeamWithScore(matches, "Villa", "1")
      }
    }

    scenario("Competition results filter") { // filter has been removed and will be re-implemented differently

      Given("I am on the the results page")
      HtmlUnit("/football/results") { browser =>
        import browser._

        When("I click the filter to premier league link")

        findFirst("[data-link-name='view Premier League matches']").click()
        browser.await()

        Then("I should navigate to the premier league results page")
        val matches = $(".football-match__team")
        browser.url() should endWith("/football/premierleague/results")
        assertTeamWithScore(matches, "Sunderland", "1")
        assertTeamWithScore(matches, "West Ham", "1")

        And("I should not see other leagues results")
        assertNotTeamWithScore(matches, "Arsenal", "1")
        assertNotTeamWithScore(matches, "Spurs", "0")
      }
    }

    scenario("Link tracking") {
      Given("I visit the results page")
      HtmlUnit("/football/results") { browser =>
        import browser._
        Then("any links I click should be tracked")
        $("a").filter(link => !Option(link.getAttribute("data-link-name")).isDefined).foreach { link =>
          fail(s"Link with text ${link.getText} has no data-link-name")
        }
      }
    }

    scenario("The 'Classic version' link points to the correct, equivalent classic page") {

      Given("I visit the results page")
      And("I am on the 'UK' edition")
      HtmlUnit("/football/results") { browser =>
        import browser._

        Then("the 'Classic version' link should point to '/football/results?view=classic'")
        findFirst(".js-main-site-link").getAttribute("href") should be(ClassicVersionLink("/football/results"))
      }

      Given("I visit the results page")
      And("I am on the 'US' edition")
      HtmlUnit.US("/football/results") { browser =>
        import browser._

        Then("the 'Classic version' link should point to '/football/results?view=classic'")
        findFirst(".js-main-site-link").getAttribute("href") should be(ClassicVersionLink("/football/results"))
      }

    }
  }
}
