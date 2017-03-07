(function () {
    'use strict';

    var DEFAULT_FEE_AMOUNT = '0.001';

    function WavesWalletListController($scope, $interval, events, applicationContext,
                                       apiService, transactionLoadingService) {
        var walletList = this;
        var refreshPromise;
        var refreshDelay = 10 * 1000;

        function unimplementedFeature() {
            $scope.home.featureUnderDevelopment();
        }

        function findWalletByCurrency(currency) {
            return _.find(walletList.wallets, function (w) {
                return w.balance.currency.id === currency.id;
            });
        }

        walletList.wallets = [
            {
                balance: new Money(0, Currency.UPC)
            },
            {
                balance: new Money(0, Currency.BTC)
            },
            {
                balance: new Money(0, Currency.WAV),
                hidden: true
            }
        ];
        walletList.transactions = [];
        walletList.send = send;
        walletList.withdraw = withdraw;
        walletList.trade = trade;

        loadDataFromBackend();
        patchCurrencyIdsForTestnet();

        $scope.$on('$destroy', function () {
            if (angular.isDefined(refreshPromise)) {
                $interval.cancel(refreshPromise);
                refreshPromise = undefined;
            }
        });

        function send (currency) {
            var assetWallet = findWalletByCurrency(currency);
            var upcoinWallet = findWalletByCurrency(Currency.UPC);

            $scope.$broadcast(events.WALLET_SEND, {
                assetBalance: assetWallet.balance,
                wavesBalance: upcoinWallet.balance
            });
        }

        function withdraw (currency) {
            unimplementedFeature();
        }

        function trade (currency) {
            unimplementedFeature();
        }

        function loadDataFromBackend() {
            refreshWallets();
            refreshTransactions();

            refreshPromise = $interval(function() {
                refreshWallets();
                refreshTransactions();
            }, refreshDelay);
        }

        function refreshWallets() {
            apiService.address.balance(applicationContext.account.address)
                .then(function (response) {
                    var wavesWallet = findWalletByCurrency(Currency.WAV);
                    wavesWallet.balance = Money.fromCoins(response.balance, Currency.WAV);
                });

            apiService.assets.balance(applicationContext.account.address).then(function (response) {
                _.forEach(response.balances, function (assetBalance) {
                    var id = assetBalance.assetId;

                    // adding asset details to cache
                    applicationContext.cache.assets.put(assetBalance.issueTransaction);
                    applicationContext.cache.assets.update(id, assetBalance.balance,
                        assetBalance.reissuable, assetBalance.quantity);
                });

                _.forEach(walletList.wallets, function (wallet) {
                    var asset = applicationContext.cache.assets[wallet.balance.currency.id];
                    if (asset) {
                        wallet.balance = asset.balance;
                    }
                });
            });
        }

        function refreshTransactions() {
            var txArray;
            transactionLoadingService.loadTransactions(applicationContext.account.address)
                .then(function (transactions) {
                    txArray = transactions;

                    return transactionLoadingService.refreshAssetCache(applicationContext.cache.assets, transactions);
                })
                .then(function () {
                    walletList.transactions = txArray;
                });
        }

        /* AssetId substitution for testnet only.
           Mainnet version uses default asset identifiers.
         */
        function patchCurrencyIdsForTestnet() {
            if ($scope.isTestnet()) {
                Currency.EUR.id = '8zEZuJcKPQmFuYgVe5ZMpxgiPLu5zBhjA6xgdGomQDaP';
                Currency.USD.id = '2aSqCbvCTgvCpwkGsk4mea4tCLG4Zgp69aQDhHNvRUZv';
                Currency.CNY.id = 'D2MNuUyA38pSKoV7F7vpS15Uhw9nw5qfbrGUfCLRNuRo';
                Currency.BTC.id = '7g151iXK8fyxB5sBUHkwQNXhVBuXdbK8ftPB3h1NrrYV';
                Currency.UPC.id = '6MPKrD5B7GrfbciHECg1MwdvRUhRETApgNZspreBJ8JL';
            }
        }
    }

    WavesWalletListController.$inject = ['$scope', '$interval', 'wallet.events',
        'applicationContext', 'apiService', 'transactionLoadingService'];

    angular
        .module('app.wallet')
        .controller('walletListController', WavesWalletListController);
})();
