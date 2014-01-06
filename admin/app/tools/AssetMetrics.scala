package tools

import CloudWatch._
import com.amazonaws.services.cloudwatch.model.{GetMetricStatisticsResult, Dimension, GetMetricStatisticsRequest}
import org.joda.time.DateTime
import scala.collection.JavaConversions._

case class AssetData(
  name: String,
  raw: AssetChart,
  zipped: AssetChart,
  rules: AssetChart,
  selectors: AssetChart
) {
  def combined: AssetChart = new AssetChart(name, Seq("Size", "GZip (kb)", "None (kb)"), raw.charts.head, zipped.charts.head).withFormat(ChartFormat.DoubleLineBlueRed)
  lazy val isCSS = name.endsWith(".css")
  lazy val isJS = name.endsWith(".js")
  lazy val rawChange = (raw.dataset.last.values.headOption.getOrElse(0.0) - raw.dataset.head.values.headOption.getOrElse(0.0)).toFloat
  lazy val isPositiveChange = rawChange <= -0.00
}

object AssetMetrics {

  def zipped(file: String) = new AssetChart(file, Seq("Size", "Kb"), euWestClient.getMetricStatisticsAsync(new GetMetricStatisticsRequest()
    .withStartTime(new DateTime().minusDays(14).toDate)
    .withEndTime(new DateTime().toDate)
    .withPeriod(86400) //One day
    .withStatistics("Average")
    .withNamespace("Assets")
    .withMetricName(file)
    .withDimensions(
      new Dimension().withName("Compression").withValue("GZip")
    ),
    asyncHandler)).withFormat(ChartFormat.SingleLineBlack)

  def raw(file: String) = new AssetChart(file, Seq("Size", "Kb"), euWestClient.getMetricStatisticsAsync(new GetMetricStatisticsRequest()
    .withStartTime(new DateTime().minusDays(14).toDate)
    .withEndTime(new DateTime().toDate)
    .withPeriod(86400) //One day
    .withStatistics("Average")
    .withNamespace("Assets")
    .withMetricName(file)
    .withDimensions(
      new Dimension().withName("Compression").withValue("None")
    ),
    asyncHandler)).withFormat(ChartFormat.SingleLineBlack)

  def rules(file: String) = new AssetChart(file, Seq("Rules", "Count"), euWestClient.getMetricStatisticsAsync(new GetMetricStatisticsRequest()
    .withStartTime(new DateTime().minusDays(14).toDate)
    .withEndTime(new DateTime().toDate)
    .withPeriod(86400) //One day
    .withStatistics("Average")
    .withNamespace("Assets")
    .withMetricName(file)
    .withDimensions(
      new Dimension().withName("Metric").withValue("Rules")
    ),
    asyncHandler)).withFormat(ChartFormat.SingleLineBlack)

  def selectors(file: String) = new AssetChart(file, Seq("Total selectors", "Count"), euWestClient.getMetricStatisticsAsync(new GetMetricStatisticsRequest()
    .withStartTime(new DateTime().minusDays(14).toDate)
    .withEndTime(new DateTime().toDate)
    .withPeriod(86400) //One day
    .withStatistics("Average")
    .withNamespace("Assets")
    .withMetricName(file)
    .withDimensions(
      new Dimension().withName("Metric").withValue("Total Selectors")
    ),
    asyncHandler)).withFormat(ChartFormat.SingleLineBlack)

  def assets = assetsFiles.map{ file =>
    new AssetData(file, raw(file), zipped(file), rules(file), selectors(file))
  }
}
