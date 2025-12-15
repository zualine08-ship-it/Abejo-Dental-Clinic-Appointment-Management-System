import EcommerceMetrics from "../../components/ecommerce/EcommerceMetrics";
  
import StatisticsChart from "../../components/ecommerce/StatisticsChart";
import MonthlyTarget from "../../components/ecommerce/MonthlyTarget";
import RecentAppointments from "../../components/ecommerce/RecentAppointments";
import WelcomeCard from "../../components/ecommerce/WelcomeCard";
import TodaysSummary from "../../components/ecommerce/TodaysSummary";
import ReviewRatings from "../../components/ecommerce/ReviewRatings";
import PageMeta from "../../components/common/PageMeta";

export default function Home() {
  return (
    <>
      <PageMeta
        title="Dashboard"

      />
      <div className="grid grid-cols-12 gap-2 xl:gap-3">
        <div className="col-span-12">
          <WelcomeCard />
        </div>

        <div className="col-span-12">
          <EcommerceMetrics />
        </div>

        <div className="col-span-12 xl:col-span-7">
          <MonthlyTarget />
        </div>

        <div className="col-span-12 md:col-span-5">
          <TodaysSummary />
        </div>

       

      


        <div className="col-span-12 xl:col-span-7">
          <ReviewRatings section="procedures" />
        </div>
        
        <div className="col-span-12 md:col-span-5">
          <RecentAppointments />
        </div>

        <div className="col-span-12 md:col-span-5">
          <ReviewRatings section="reviews" />
        </div>
         
      </div>
    </>
  );
}
