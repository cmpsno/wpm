#include <iomanip>
#include <iostream>
int main() { double balance, withdrawal; std::cin >> balance >> withdrawal; if (withdrawal > balance) std::cout << "Insufficient funds\n"; else std::cout << std::fixed << std::setprecision(2) << "Remaining balance: " << balance - withdrawal << "\n"; }
