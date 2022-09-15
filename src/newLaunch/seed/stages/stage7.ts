import { toBigNumberJs } from "services/BigNumberService";
import { ISeedConfig, SeedConfig } from "newLaunch/seed/config";
import { EthereumService, fromWei, toWei } from "services/EthereumService";
import { autoinject, computedFrom } from "aurelia-framework";
import { BaseStage } from "newLaunch/baseStage";
import { Router, Redirect, RouteConfig } from "aurelia-router";
import { SeedService } from "services/SeedService";
import { EventAggregator } from "aurelia-event-aggregator";
import { EventConfigException } from "services/GeneralEvents";
import { NumberService } from "services/NumberService";
import { TokenService } from "services/TokenService";

@autoinject
export class Stage7 extends BaseStage<ISeedConfig> {

  disclaimersConfirmed = false;

  constructor(
    router: Router,
    eventAggregator: EventAggregator,
    private seedService: SeedService,
    ethereumService: EthereumService,
    tokenService: TokenService,
    private numberService: NumberService) {
    super(router, ethereumService, eventAggregator, tokenService);
    // @ts-ignore
    window.stage7 = this;
  }

  public async canActivate(_params: unknown, routeConfig: RouteConfig): Promise<boolean | Redirect> {
    /**
     * heuristic for whether we have data.  Possibility is that the user
     * has used the 'back' button or otherwize figured out how to return
     * to this page, for example, just after having submitting a Seed,
     * where the launchConfig will have been deleted.
     */
    if (!routeConfig.settings.launchConfig.general.projectName?.length) {
      // return new Redirect("");
    } else {
      return true;
    }
  }

  bind(): void {
    /* prettier-ignore */ console.log(">>>> _ >>>> ~ file: stage7.ts ~ line 45 ~ bind");
    /** Dev  */
    const result = this.seedService.dev_setSeedConfigFromLocalStorage();
    if (result !== null) {
      this.launchConfig = new SeedConfig();
      this.launchConfig = {
        ...this.launchConfig,
        ...result,
      };
      /* prettier-ignore */ console.log(">>>> _ >>>> ~ file: stage7.ts ~ line 49 ~ this.launchConfig", this.launchConfig);
    }
  }

  attached(): void {
    // this.launchConfig.launchDetails.fundingMax = toWei("100").toString();
    // this.launchConfig.launchDetails.pricePerToken = toWei(".5").toString();
    // this.launchConfig.tokenDetails.projectTokenInfo.symbol = "PRIME";
    // const pricePerToken = this.seedService.projectTokenPrice(
    //   this.launchConfig.launchDetails.fundingTokenInfo,
    //   this.launchConfig.launchDetails.pricePerToken,
    //   this.launchConfig.tokenDetails.projectTokenInfo);

    const distributableSeeds = toBigNumberJs(fromWei(this.launchConfig.launchDetails.fundingMax, this.launchConfig.launchDetails.fundingTokenInfo.decimals))
      .idiv(this.launchConfig.launchDetails.pricePerToken);
    this.wizardState.requiredProjectTokenDeposit = toWei(distributableSeeds.plus(distributableSeeds.multipliedBy(SeedService.seedFee)).toString(),
      this.launchConfig.tokenDetails.projectTokenInfo.decimals);
  }

  async submit(): Promise<void> {
    try {
      this.eventAggregator.publish("launch.creating", true);

      // this.seedService.dev_setSeedConfigFromLocalStorage(this.launchConfig);


      this.wizardState.launchHash = await this.seedService.deploySeed(this.launchConfig);
      if (this.wizardState.launchHash) {
        this.next();
      }
    } catch (ex) {
      this.eventAggregator.publish("handleException", new EventConfigException("Sorry, an error occurred", ex));
    }
    finally {
      this.eventAggregator.publish("launch.creating", false);
    }
  }

  @computedFrom("ethereumService.defaultAccountAddress")
  get connected(): boolean { return !!this.ethereumService.defaultAccountAddress;}

  connect(): void {
    this.ethereumService.ensureConnected();
  }
}
